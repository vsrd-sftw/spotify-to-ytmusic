"""Authentication routes: Spotify OAuth and YT Music headers."""
import asyncio
import secrets

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse

from spotify_to_ytmusic.api.models import AuthUrlResponse, ErrorResponse, OkResponse
from spotify_to_ytmusic.api.state import state_store
from spotify_to_ytmusic.core.config import (
    BROWSER_AUTH_FILE,
    SPOTIFY_CREDENTIALS_FILE,
    SPOTIFY_TOKEN_CACHE_FILE,
)

router = APIRouter(prefix="/api")

# setup_browser is supposed to be local-only in ytmusicapi >= 1.10, but in
# packaged builds we have observed it hanging (#94, #99). Wall-clock cap so
# the frontend always gets a response.
YTMUSIC_SETUP_TIMEOUT_S = 8.0


def _error(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content=ErrorResponse(message=message).model_dump(by_alias=True))


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
    import os
    client_id = os.getenv("SPOTIFY_CLIENT_ID", "")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        return ErrorResponse(message="Credenciales de Spotify no configuradas. Configúralas primero.")
    state = secrets.token_urlsafe(32)
    redirect_uri = _resolve_redirect_uri(request)
    state_store.set(state, ttl_seconds=300, redirect_uri=redirect_uri)
    oauth = _get_spotify_oauth(state=state, redirect_uri=redirect_uri)
    url = oauth.get_authorize_url()
    return AuthUrlResponse(url=url)


def _resolve_redirect_uri(request: Request) -> str:
    """Return the callback URL that Spotify will redirect to after auth.

    Uses the same host:port the request arrived at, so it works with
    dynamically-assigned sidecar ports.
    """
    port = request.url.port or 8000
    return f"http://127.0.0.1:{port}/api/auth/spotify/callback"


@router.get("/auth/spotify/callback")
async def auth_spotify_callback(request: Request, code: str = "", state: str = ""):
    from fastapi.responses import HTMLResponse

    stored = state_store.get(state)
    if not stored:
        return HTMLResponse(
            content=_callback_html("Error", "Estado de autenticación inválido o expirado. Vuelve a la aplicación e inténtalo de nuevo."),
            status_code=400,
        )
    state_store.delete(state)
    redirect_uri = stored.get("redirect_uri")
    oauth = _get_spotify_oauth(redirect_uri=redirect_uri)
    try:
        oauth.get_access_token(code, as_dict=True, check_cache=False)
    except Exception as e:
        return HTMLResponse(
            content=_callback_html("Error", f"Error al conectar con Spotify: {e}"),
            status_code=400,
        )
    return HTMLResponse(content=_callback_html("Conectado", "Autenticación con Spotify completada. Ya puedes volver a la aplicación."))


def _callback_html(title: str, message: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>{title}</title>
<style>
  body {{ font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #111; color: #e0e0e0; }}
  .box {{ text-align: center; padding: 2rem; max-width: 420px; }}
  h1 {{ font-size: 1.5rem; margin-bottom: 0.75rem; }}
  p {{ color: #999; margin-bottom: 1.5rem; }}
  button {{ background: #7c3aed; color: #fff; border: none; padding: 0.625rem 1.25rem; border-radius: 0.5rem; font-size: 0.9375rem; cursor: pointer; }}
  button:hover {{ background: #6d28d9; }}
</style>
</head>
<body><div class="box"><h1>{title}</h1><p>{message}</p>
<button onclick="window.close()">Cerrar esta pestaña</button>
</div>
<script>try {{ window.close() }} catch (_) {{ /* best-effort */ }}</script>
</body>
</html>"""


@router.post("/auth/ytmusic")
async def auth_ytmusic(body: dict):
    headers = body.get("headers", "")
    if not isinstance(headers, str) or not headers.strip():
        return _error(400, "Pega los headers del navegador antes de continuar.")
    from ytmusicapi.auth.browser import setup_browser
    from ytmusicapi.exceptions import YTMusicUserError
    from spotify_to_ytmusic.core.headers_parser import normalize_headers

    normalized = normalize_headers(headers)
    if not normalized.strip():
        return _error(400, "No se pudieron parsear los headers. Pega el bloque entero de request headers.")
    lower = normalized.lower()
    if "cookie:" not in lower or "user-agent:" not in lower:
        return _error(400, "Los headers deben incluir al menos cookie: y user-agent:.")
    if "x-goog-authuser:" not in lower:
        return _error(
            400,
            'Falta el header x-goog-authuser. Copia los headers de una petición /browse '
            'en la pestaña Network de DevTools (F12) y asegúrate de incluir este header.',
        )

    loop = asyncio.get_running_loop()
    try:
        await asyncio.wait_for(
            loop.run_in_executor(
                None,
                lambda: setup_browser(filepath=BROWSER_AUTH_FILE, headers_raw=normalized),
            ),
            timeout=YTMUSIC_SETUP_TIMEOUT_S,
        )
    except asyncio.TimeoutError:
        return _error(
            504,
            "La conexión con YouTube Music está tardando demasiado. Vuelve a copiar los headers "
            "desde una petición /browse reciente y prueba de nuevo.",
        )
    except YTMusicUserError as e:
        return _error(400, f"Error en los headers: {e}")
    except Exception as e:
        return _error(500, f"No se pudo conectar con YouTube Music: {e}")
    return OkResponse(ok=True)


@router.delete("/auth/ytmusic")
async def disconnect_ytmusic() -> OkResponse:
    import os
    if os.path.isfile(BROWSER_AUTH_FILE):
        os.remove(BROWSER_AUTH_FILE)
    return OkResponse(ok=True)


@router.delete("/auth/spotify")
async def disconnect_spotify() -> OkResponse:
    import os
    if os.path.isfile(SPOTIFY_TOKEN_CACHE_FILE):
        os.remove(SPOTIFY_TOKEN_CACHE_FILE)
    if os.path.isfile(SPOTIFY_CREDENTIALS_FILE):
        os.remove(SPOTIFY_CREDENTIALS_FILE)
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


@router.delete("/auth/spotify/setup")
async def delete_spotify_setup() -> OkResponse:
    if _os.path.isfile(SPOTIFY_CREDENTIALS_FILE):
        _os.remove(SPOTIFY_CREDENTIALS_FILE)
    _os.environ.pop("SPOTIFY_CLIENT_ID", None)
    _os.environ.pop("SPOTIFY_CLIENT_SECRET", None)
    return OkResponse(ok=True)
