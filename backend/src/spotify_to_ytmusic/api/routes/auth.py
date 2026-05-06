"""Authentication routes: Spotify OAuth and YT Music headers."""
import secrets

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from spotify_to_ytmusic.api.models import AuthUrlResponse, ErrorResponse, OkResponse
from spotify_to_ytmusic.api.state import state_store
from spotify_to_ytmusic.core.config import (
    BROWSER_AUTH_FILE,
    SPOTIFY_TOKEN_CACHE_FILE,
)

router = APIRouter(prefix="/api")


def _get_spotify_oauth(state: str | None = None):
    """Create a SpotifyOAuth instance without opening a browser."""
    import os
    from spotipy.oauth2 import SpotifyOAuth
    from spotify_to_ytmusic.core.config import SPOTIFY_SCOPES

    client_id = os.getenv("SPOTIFY_CLIENT_ID", "")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET", "")
    redirect_uri = os.getenv(
        "SPOTIFY_REDIRECT_URI",
        "http://127.0.0.1:8000/api/auth/spotify/callback",
    )
    return SpotifyOAuth(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
        scope=SPOTIFY_SCOPES,
        cache_path=SPOTIFY_TOKEN_CACHE_FILE,
        state=state,
    )


@router.post("/auth/spotify")
async def auth_spotify() -> AuthUrlResponse | ErrorResponse:
    state = secrets.token_urlsafe(32)
    state_store.set(state, ttl_seconds=600)
    oauth = _get_spotify_oauth(state=state)
    url = oauth.get_authorize_url()
    return AuthUrlResponse(url=url)


@router.get("/auth/spotify/callback")
async def auth_spotify_callback(request: Request, code: str = "", state: str = ""):
    if not state or not state_store.get(state):
        return ErrorResponse(message="Estado de autenticación inválido o expirado.")
    state_store.delete(state)
    oauth = _get_spotify_oauth()
    try:
        oauth.get_access_token(code, as_dict=True)
    except Exception as e:
        return ErrorResponse(message=f"Error al obtener el token de Spotify: {e}")
    origin = request.headers.get("origin", "http://localhost:5173")
    return RedirectResponse(url=origin, status_code=302)


@router.post("/auth/ytmusic")
async def auth_ytmusic(body: dict) -> OkResponse | ErrorResponse:
    headers = body.get("headers", "")
    if not isinstance(headers, str) or not headers.strip():
        return ErrorResponse(message="Pega los headers del navegador antes de continuar.")
    lower = headers.lower()
    if "cookie:" not in lower or "user-agent:" not in lower:
        return ErrorResponse(
            message="Los headers deben incluir al menos cookie: y user-agent:."
        )
    from ytmusicapi.auth.browser import setup_browser
    from spotify_to_ytmusic.core.headers_parser import normalize_headers

    normalized = normalize_headers(headers)
    setup_browser(filepath=BROWSER_AUTH_FILE, headers_raw=normalized)
    return OkResponse(ok=True)
