"""Tunable constants for rate limiting, batching, search behavior, and paths."""
import os
from pathlib import Path

SPOTIFY_PLAYLIST_PAGE_SIZE = 50
SPOTIFY_TRACK_PAGE_SIZE = 100
SPOTIFY_ALBUM_PAGE_SIZE = 50
SPOTIFY_TRACK_FETCH_DELAY_S = 1.5

YTMUSIC_SEARCH_DELAY_S = 0.3
YTMUSIC_PLAYLIST_CHUNK_SIZE = 50
YTMUSIC_PLAYLIST_CHUNK_DELAY_S = 0.5
YTMUSIC_SEARCH_RESULT_LIMIT = 10
YTMUSIC_ADD_ITEMS_MAX_RETRIES = 5
YTMUSIC_ADD_ITEMS_BACKOFF_BASE_S = 1.0

SPOTIFY_SCOPES = (
    "user-library-read playlist-read-private playlist-read-collaborative"
)
DEFAULT_SPOTIFY_REDIRECT_URI = "http://127.0.0.1:8888/callback"

# Where state files (browser.json, .cache, reports) are written.
# Override with $SPOTIFY_TO_YTMUSIC_DATA_DIR; defaults to backend/data.
DATA_DIR = Path(os.getenv("SPOTIFY_TO_YTMUSIC_DATA_DIR", "data")).resolve()
DATA_DIR.mkdir(parents=True, exist_ok=True)

BROWSER_AUTH_FILE = str(DATA_DIR / "browser.json")
SPOTIFY_TOKEN_CACHE_FILE = str(DATA_DIR / ".cache")
TRACK_CACHE_FILE = str(DATA_DIR / "track_cache.json")
