"""Authentication routes: Spotify OAuth and YT Music headers."""
import secrets

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from spotify_to_ytmusic.api.models import AuthUrlResponse, ErrorResponse, OkResponse
from spotify_to_ytmusic.api.state import state_store
from spotify_to_ytmusic.core.config import (
    BROWSER_AUTH_FILE,
    SPOTIFY_CREDENTIALS_FILE,
    SPOTIFY_TOKEN_CACHE_FILE,
)

router = APIRouter(prefix="/api")


def _get_spotify_oauth(state: str | None = None, redirect_uri: str | None = None):
    """Create a SpotifyOAuth instance without opening a browser.

    ``redirect_uri`` overrides the default API callback.  The env var
    ``SPOTIFY_REDIRECT_URI`` is deliberately *not* consulted here — it
    belongs to the CLI flow (:8888), not the API server (:8000).
    """
    import os
    from spotipy.oauth2 import SpotifyOAuth
    from spotify_to_ytmusic.core.config import SPOTIFY_SCOPES

    client_id = os.getenv("SPOTIFY_CLIENT_ID", "")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET", "")
    effective_redirect = redirect_uri or "http://127.0.0.1:8000/api/auth/spotify/callback"
    return SpotifyOAuth(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=effective_redirect,
        scope=SPOTIFY_SCOPES,
        cache_path=SPOTIFY_TOKEN_CACHE_FILE,
        state=state,
    )


@router.post("/auth/spotify")
async def auth_spotify(request: Request) -> AuthUrlResponse | ErrorResponse:
    state = secrets.token_urlsafe(32)
    redirect_uri = _resolve_redirect_uri(request)
    state_store.set(state, ttl_seconds=300, redirect_uri=redirect_uri)
    oauth = _get_spotify_oauth(state=state, redirect_uri=redirect_uri)
    url = oauth.get_authorize_url()
    return AuthUrlResponse(url=url)


def _resolve_redirect_uri(request: Request) -> str:
    """Return the callback URL that Spotify will redirect to after auth.

    Routes the callback through the Vite dev proxy when the request
    originates from the Vite dev server, because the Tauri webview
    cannot reach the backend directly.
    """
    origin = request.headers.get("origin", "")
    if origin in ("tauri://localhost", "https://tauri.localhost"):
        return "http://127.0.0.1:53682/api/auth/spotify/callback"
    if origin and origin.startswith("http://localhost:"):
        return f"{origin}/api/auth/spotify/callback"
    referer = request.headers.get("referer", "")
    if referer.startswith("http://localhost:5173"):
        return "http://localhost:5173/api/auth/spotify/callback"
    return "http://localhost:5173/api/auth/spotify/callback"


@router.get("/auth/spotify/callback")
async def auth_spotify_callback(request: Request, code: str = "", state: str = ""):
    stored = state_store.get(state)
    if not stored:
        return ErrorResponse(message="Estado de autenticación inválido o expirado.")
    state_store.delete(state)
    redirect_uri = stored.get("redirect_uri")
    oauth = _get_spotify_oauth(redirect_uri=redirect_uri)
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


# ---- Spotify credentials persistence (desktop app) ----

import json
import os as _os


def _load_spotify_credentials() -> dict[str, str] | None:
    if not _os.path.isfile(SPOTIFY_CREDENTIALS_FILE):
        return None
    try:
        with open(SPOTIFY_CREDENTIALS_FILE, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data.get("client_id"), str) and isinstance(data.get("client_secret"), str):
            return data
    except (OSError, json.JSONDecodeError):
        pass
    return None


def load_persisted_credentials() -> None:
    """Load Spotify credentials from disk into environment variables.

    Called on server startup so ``os.getenv`` picks them up.
    Existing env vars take precedence over the persisted file.
    """
    if _os.getenv("SPOTIFY_CLIENT_ID"):
        return
    data = _load_spotify_credentials()
    if data:
        _os.environ["SPOTIFY_CLIENT_ID"] = data["client_id"]
        _os.environ["SPOTIFY_CLIENT_SECRET"] = data["client_secret"]


@router.get("/auth/spotify/setup")
async def get_spotify_setup() -> dict:
    data = _load_spotify_credentials()
    return {"configured": data is not None}


@router.post("/auth/spotify/setup")
async def post_spotify_setup(body: dict) -> OkResponse | ErrorResponse:
    client_id = (body.get("client_id") or "").strip()
    client_secret = (body.get("client_secret") or "").strip()
    if not client_id or not client_secret:
        return ErrorResponse(message="client_id y client_secret son obligatorios.")
    with open(SPOTIFY_CREDENTIALS_FILE, "w", encoding="utf-8") as f:
        json.dump({"client_id": client_id, "client_secret": client_secret}, f)
    _os.environ["SPOTIFY_CLIENT_ID"] = client_id
    _os.environ["SPOTIFY_CLIENT_SECRET"] = client_secret
    return OkResponse(ok=True)
