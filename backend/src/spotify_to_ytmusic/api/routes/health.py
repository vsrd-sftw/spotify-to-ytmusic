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
        import json
        import time

        data = json.loads(cache.read_text())
        expires_at = data.get("expires_at", 0)
        return time.time() < expires_at
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
        # Silent failure here used to leave the UI showing ytmusic:false
        # with no clue why (eg. PyInstaller missing data files for
        # ytmusicapi locales). Trace to a log next to browser.json so the
        # next regression is one Get-Content away from a fix.
        import traceback
        try:
            log_path = Path(BROWSER_AUTH_FILE).parent / "ytmusic_health.log"
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(traceback.format_exc())
                f.write("\n")
        except Exception:
            pass
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
