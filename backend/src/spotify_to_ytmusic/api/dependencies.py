"""FastAPI dependencies for shared resources."""
import os

from fastapi import Depends, HTTPException, status
from spotipy.oauth2 import SpotifyOauthError

from spotify_to_ytmusic.core.config import (
    DEFAULT_SPOTIFY_REDIRECT_URI,
    SPOTIFY_TOKEN_CACHE_FILE,
)
from spotify_to_ytmusic.core.spotify_client import SpotifyClient

_spotify_client: SpotifyClient | None = None


def get_spotify_client() -> SpotifyClient:
    global _spotify_client
    if _spotify_client is None:
        client_id = os.getenv("SPOTIFY_CLIENT_ID", "")
        client_secret = os.getenv("SPOTIFY_CLIENT_SECRET", "")
        redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI", DEFAULT_SPOTIFY_REDIRECT_URI)
        try:
            _spotify_client = SpotifyClient(
                client_id=client_id,
                client_secret=client_secret,
                redirect_uri=redirect_uri,
                open_browser=False,
            )
        except SpotifyOauthError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"message": f"Spotify authentication not available: {exc}"},
            ) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"message": f"Spotify client unavailable: {exc}"},
            ) from exc
    return _spotify_client
