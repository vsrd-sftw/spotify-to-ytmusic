"""Spotify Web API client. Returns domain models, hides pagination."""
import time

import spotipy
from spotipy.exceptions import SpotifyException
from spotipy.oauth2 import SpotifyOAuth

from spotify_to_ytmusic.core.config import (
    SPOTIFY_ALBUM_PAGE_SIZE,
    SPOTIFY_PLAYLIST_PAGE_SIZE,
    SPOTIFY_SCOPES,
    SPOTIFY_TOKEN_CACHE_FILE,
    SPOTIFY_TRACK_FETCH_DELAY_S,
    SPOTIFY_TRACK_PAGE_SIZE,
)
from spotify_to_ytmusic.core.models import Album, Playlist, PlaylistSummary, Track


class SpotifyClient:
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str, open_browser: bool = True):
        self.sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
            scope=SPOTIFY_SCOPES,
            cache_path=SPOTIFY_TOKEN_CACHE_FILE,
            open_browser=open_browser,
        ))

    def get_current_user_id(self) -> str:
        return self.sp.current_user()["id"]

    def get_all_playlist_items(self) -> list[dict]:
        """Gets all playlist metadata items from Spotify, without tracks."""
        items: list[dict] = []
        page = self.sp.current_user_playlists(limit=SPOTIFY_PLAYLIST_PAGE_SIZE)
        while page:
            items.extend(page["items"])
            page = self.sp.next(page) if page["next"] else None
        return items

    def list_playlist_summaries(self, user_id: str) -> list[PlaylistSummary]:
        """Lightweight listing: metadata only, no track fetches."""
        summaries: list[PlaylistSummary] = []
        for item in self.get_all_playlist_items():
            if not item:
                continue
            owner_id = (item.get("owner") or {}).get("id", "")
            # Spotify renamed the legacy "tracks" subobject to "items"; fall back for older shapes.
            tracks_meta = item.get("items") or item.get("tracks") or {}
            summaries.append(
                PlaylistSummary(
                    id=item["id"],
                    name=item.get("name", "Unknown"),
                    description=item.get("description") or "",
                    track_count=tracks_meta.get("total", 0),
                    owner_id=owner_id,
                    is_own=(owner_id == user_id),
                )
            )
        return summaries

    def build_playlist_from_item(self, item: dict) -> Playlist | None:
        """Builds a full Playlist object, including tracks, from a metadata item."""
        return self._build_playlist(item)

    def load_playlist_by_id(
        self, playlist_id: str, name: str, description: str
    ) -> Playlist | None:
        """Loads tracks for a single playlist on demand."""
        try:
            tracks = self._get_playlist_tracks(playlist_id)
        except SpotifyException as e:
            if e.http_status == 403:
                return None
            raise
        return Playlist(id=playlist_id, name=name, description=description, tracks=tracks)
    def _build_playlist(self, item: dict | None) -> Playlist | None:
        if not item:
            return None
        try:
            tracks = self._get_playlist_tracks(item["id"])
        except SpotifyException as e:
            if e.http_status == 403:
                return None
            raise
        return Playlist(
            id=item["id"],
            name=item["name"],
            description=item.get("description") or "",
            tracks=tracks,
        )

    def _get_playlist_tracks(self, playlist_id: str) -> list[Track]:
        tracks: list[Track] = []
        time.sleep(SPOTIFY_TRACK_FETCH_DELAY_S)
        page = self.sp.playlist_tracks(playlist_id, limit=SPOTIFY_TRACK_PAGE_SIZE)
        while page:
            for item in page["items"]:
                track = self._build_track(item)
                if track is not None:
                    tracks.append(track)
            if page["next"]:
                time.sleep(SPOTIFY_TRACK_FETCH_DELAY_S)
                page = self.sp.next(page)
            else:
                page = None
        return tracks

    @staticmethod
    def _build_track(item: dict | None) -> Track | None:
        if not item:
            return None
        # Spotify's playlist_tracks response uses "item" for the track object;
        # the legacy "track" key is now a boolean flag indicating item type.
        track = item.get("item")
        if not isinstance(track, dict):
            track = item.get("track") if isinstance(item.get("track"), dict) else None
        if not track:
            return None
        artists = track.get("artists") or []
        artist_name = artists[0].get("name", "Unknown") if artists else "Unknown"
        album = track.get("album") or {}
        return Track(
            name=track.get("name", "Unknown"),
            artist=artist_name,
            album=album.get("name", "Unknown"),
            duration_ms=track.get("duration_ms") or 0,
            spotify_id=track.get("id") or "",
        )

    def get_saved_albums(self) -> list[Album]:
        albums: list[Album] = []
        page = self.sp.current_user_saved_albums(limit=SPOTIFY_ALBUM_PAGE_SIZE)
        while page:
            for item in page["items"]:
                album = self._build_album(item)
                if album is not None:
                    albums.append(album)
            page = self.sp.next(page) if page["next"] else None
        return albums

    @staticmethod
    def _build_album(item: dict | None) -> Album | None:
        if not item:
            return None
        album = item["album"]
        artists = album.get("artists") or []
        artist_name = artists[0]["name"] if artists else "Unknown"
        return Album(name=album["name"], artist=artist_name, spotify_id=album["id"])
