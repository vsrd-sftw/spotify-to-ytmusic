"""Migration orchestrator. Emits events; does not print directly."""
import time
from pathlib import Path

from spotify_to_ytmusic.core.config import TRACK_CACHE_FILE, YTMUSIC_SEARCH_DELAY_S
from spotify_to_ytmusic.core.events import (
    AlbumProcessed,
    AlbumsDiscovered,
    EventCallback,
    PlaylistFinished,
    PlaylistStarted,
    PlaylistsDiscovered,
)
from spotify_to_ytmusic.core.models import (
    Album,
    AlbumMigrationResult,
    MigrationReport,
    MissingItem,
    Playlist,
    PlaylistMigrationResult,
    Track,
)
from spotify_to_ytmusic.core.spotify_client import SpotifyClient
from spotify_to_ytmusic.core.track_cache import TrackCache
from spotify_to_ytmusic.core.ytmusic_client import (
    YTMusicClient,
    YTMusicFatalError,
    YTMusicTransientError,
)


def _noop(_event) -> None:
    pass


class Migrator:
    def __init__(
        self,
        spotify: SpotifyClient,
        ytmusic: YTMusicClient,
        on_event: EventCallback = _noop,
        cache: TrackCache | None = None,
    ):
        self.spotify = spotify
        self.ytmusic = ytmusic
        self.on_event = on_event
        self.cache = cache if cache is not None else TrackCache(Path(TRACK_CACHE_FILE))
        self.report = MigrationReport()

    def migrate_playlists(self, playlist_ids: list[str] | None = None) -> None:
        user_id = self.spotify.get_current_user_id()
        summaries = self.spotify.list_playlist_summaries(user_id)
        if playlist_ids is not None:
            wanted = set(playlist_ids)
            summaries = [s for s in summaries if s.id in wanted]
        self.on_event(PlaylistsDiscovered(count=len(summaries)))
        for summary in summaries:
            playlist = self.spotify.load_playlist_by_id(
                summary.id, summary.name, summary.description
            )
            if playlist:
                self._migrate_playlist(playlist)
        self.cache.flush()

    def _migrate_playlist(self, playlist: Playlist) -> None:
        self.on_event(PlaylistStarted(name=playlist.name, track_count=len(playlist.tracks)))

        video_ids: list[str] = []
        not_found: list[str] = []
        for track in playlist.tracks:
            video_id = self._find_track_video_id(track)
            if video_id is not None:
                video_ids.append(video_id)
            else:
                not_found.append(track.label)
                self.report.not_found.append(
                    MissingItem(context=f"playlist:{playlist.name}", item=track.label)
                )

        yt_playlist_id: str | None = None
        error_message: str | None = None
        try:
            yt_playlist_id = self.ytmusic.create_playlist(
                playlist.name, playlist.description, video_ids
            )
        except YTMusicFatalError as exc:
            # Per-playlist abort: record the error and move on so a single
            # broken playlist does not kill the whole job.
            error_message = str(exc)
        except YTMusicTransientError as exc:
            error_message = f"transient (max retries exceeded): {exc}"

        finished_found = len(video_ids) if error_message is None else 0
        self.report.playlists.append(
            PlaylistMigrationResult(
                name=playlist.name,
                total=len(playlist.tracks),
                found=finished_found,
                yt_playlist_id=yt_playlist_id,
                error=error_message,
            )
        )
        self.on_event(
            PlaylistFinished(
                name=playlist.name,
                found=finished_found,
                total=len(playlist.tracks),
                not_found_labels=not_found,
            )
        )
        self.cache.flush()

    def _find_track_video_id(self, track: Track) -> str | None:
        hit, cached = self.cache.get(track.spotify_id)
        if hit:
            return cached
        time.sleep(YTMUSIC_SEARCH_DELAY_S)
        # YTMusicFatalError propagates: auth/quota expired mid-job aborts the
        # whole job. Re-running picks up where the TrackCache left off.
        video_id = self.ytmusic.search_song(track.name, track.artist)
        if track.spotify_id:
            if video_id:
                self.cache.set_hit(track.spotify_id, video_id)
            else:
                self.cache.set_miss(track.spotify_id)
        return video_id

    def migrate_albums(self) -> None:
        albums = self.spotify.get_saved_albums()
        self.on_event(AlbumsDiscovered(count=len(albums)))
        for album in albums:
            self._migrate_album(album)

    def _migrate_album(self, album: Album) -> None:
        time.sleep(YTMUSIC_SEARCH_DELAY_S)
        try:
            match = self.ytmusic.search_album(album.name, album.artist)
        except YTMusicFatalError as exc:
            self.report.albums.append(
                AlbumMigrationResult(
                    label=album.label,
                    status="not found",
                    error=str(exc),
                )
            )
            self.on_event(AlbumProcessed(label=album.label, status="not found"))
            return

        if not match or not match.get("browseId"):
            self.report.not_found.append(MissingItem(context="album", item=album.label))
            self.on_event(AlbumProcessed(label=album.label, status="not found"))
            return

        error_message: str | None = None
        saved = False
        try:
            saved = self.ytmusic.save_album(match["browseId"])
        except YTMusicFatalError as exc:
            error_message = str(exc)
        except YTMusicTransientError as exc:
            error_message = f"transient (max retries exceeded): {exc}"

        status = "saved" if saved else "found (not saved)"
        self.report.albums.append(
            AlbumMigrationResult(
                label=album.label,
                status=status,
                error=error_message,
            )
        )
        self.on_event(AlbumProcessed(label=album.label, status=status))
