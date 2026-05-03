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
from spotify_to_ytmusic.core.models import Album, Playlist, Track


class SpotifyClient:
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
            scope=SPOTIFY_SCOPES,
            cache_path=SPOTIFY_TOKEN_CACHE_FILE,
            open_browser=True,
        ))

    def get_all_playlists(self) -> list[Playlist]:
        playlists: list[Playlist] = []
        page = self.sp.current_user_playlists(limit=SPOTIFY_PLAYLIST_PAGE_SIZE)
        while page:
            for item in page["items"]:
                playlist = self._build_playlist(item)
                if playlist is not None:
                    playlists.append(playlist)
            page = self.sp.next(page) if page["next"] else None
        return playlists

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
            page = self.sp.next(page) if page["next"] else None
        return tracks

    @staticmethod
    def _build_track(item: dict | None) -> Track | None:
        track = item.get("track") if item else None
        if not track or track.get("is_local") or not track.get("id"):
            return None
        artists = track.get("artists") or []
        artist_name = artists[0]["name"] if artists else "Unknown"
        return Track(
            name=track["name"],
            artist=artist_name,
            album=track["album"]["name"],
            duration_ms=track["duration_ms"],
            spotify_id=track["id"],
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
