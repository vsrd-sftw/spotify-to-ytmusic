"""Shared pytest fixtures."""
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# Make the package importable when running `pytest` from backend/ without an
# editable install in the active interpreter.
_BACKEND_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(_BACKEND_SRC))

from spotify_to_ytmusic.core.ytmusic_client import YTMusicClient  # noqa: E402


@pytest.fixture
def ytmusic_client() -> YTMusicClient:
    """A YTMusicClient with __init__ bypassed and `.yt` swapped for a mock.

    Avoids touching the real YT Music API or filesystem during unit tests.
    """
    client = object.__new__(YTMusicClient)
    client.yt = MagicMock()
    return client


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    """Make time.sleep a no-op so retry/backoff loops don't slow tests down."""
    import time as _time

    monkeypatch.setattr(_time, "sleep", lambda *_a, **_k: None)
