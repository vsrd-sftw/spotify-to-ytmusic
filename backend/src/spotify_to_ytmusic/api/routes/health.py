"""Health check endpoint."""
from pathlib import Path

from fastapi import APIRouter

from spotify_to_ytmusic.api.models import HealthResponse
from spotify_to_ytmusic.core.config import (
    BROWSER_AUTH_FILE,
    SPOTIFY_TOKEN_CACHE_FILE,
)

router = APIRouter(prefix="/api")


def _check_spotify() -> bool:
    cache = Path(SPOTIFY_TOKEN_CACHE_FILE)
    if not cache.exists():
        return False
    try:
        from spotipy.oauth2 import SpotifyOAuth
        from spotify_to_ytmusic.core.config import SPOTIFY_SCOPES

        oauth = SpotifyOAuth(
            client_id="",
            client_secret="",
            redirect_uri="",
            scope=SPOTIFY_SCOPES,
            cache_path=SPOTIFY_TOKEN_CACHE_FILE,
        )
        token_info = oauth.get_cached_token()
        return token_info is not None
    except Exception:
        return False


def _check_ytmusic() -> bool:
    browser = Path(BROWSER_AUTH_FILE)
    if not browser.exists():
        return False
    try:
        from spotify_to_ytmusic.core.ytmusic_client import YTMusicClient

        YTMusicClient()
        return True
    except Exception:
        return False


@router.get("/health")
async def health() -> HealthResponse:
    spotify_ok = _check_spotify()
    ytmusic_ok = _check_ytmusic()
    return HealthResponse(
        ok=spotify_ok and ytmusic_ok,
        spotify=spotify_ok,
        ytmusic=ytmusic_ok,
    )
