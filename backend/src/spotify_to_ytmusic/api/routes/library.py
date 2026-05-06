"""Library routes: playlists and saved albums."""
from fastapi import APIRouter, Depends, HTTPException, status

from spotify_to_ytmusic.api.dependencies import get_spotify_client
from spotify_to_ytmusic.api.models import AlbumResponse, PlaylistSummaryResponse
from spotify_to_ytmusic.core.spotify_client import SpotifyClient

router = APIRouter(prefix="/api")


@router.get("/playlists", response_model=list[PlaylistSummaryResponse])
async def get_playlists(
    spotify: SpotifyClient = Depends(get_spotify_client),
) -> list[PlaylistSummaryResponse]:
    try:
        user_id = spotify.get_current_user_id()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": f"Spotify auth unavailable: {exc}"},
        )
    summaries = spotify.list_playlist_summaries(user_id)
    return [
        PlaylistSummaryResponse(
            id=s.id,
            name=s.name,
            description=s.description,
            track_count=s.track_count,
            owner_id=s.owner_id,
            is_own=s.is_own,
        )
        for s in summaries
    ]


@router.get("/albums", response_model=list[AlbumResponse])
async def get_albums(
    spotify: SpotifyClient = Depends(get_spotify_client),
) -> list[AlbumResponse]:
    try:
        albums = spotify.get_saved_albums()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": f"Spotify auth unavailable: {exc}"},
        )
    return [
        AlbumResponse(
            name=a.name,
            artist=a.artist,
            spotify_id=a.spotify_id,
        )
        for a in albums
    ]
