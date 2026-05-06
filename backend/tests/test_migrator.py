"""Tests for the Migrator: per-playlist/album fatal isolation; job-aborting search fatals."""
from unittest.mock import MagicMock

import pytest

from spotify_to_ytmusic.core.migrator import Migrator
from spotify_to_ytmusic.core.models import (
    Album,
    Playlist,
    PlaylistSummary,
    Track,
)
from spotify_to_ytmusic.core.track_cache import TrackCache
from spotify_to_ytmusic.core.ytmusic_client import (
    YTMusicChunkError,
    YTMusicFatalError,
    YTMusicTransientError,
)


def _make_migrator(tmp_path) -> tuple[Migrator, MagicMock, MagicMock]:
    spotify = MagicMock()
    ytmusic = MagicMock()
    cache = TrackCache(tmp_path / "cache.json")
    migrator = Migrator(spotify=spotify, ytmusic=ytmusic, cache=cache)
    return migrator, spotify, ytmusic


def _track(name: str, spot_id: str = "") -> Track:
    return Track(
        name=name,
        artist="A",
        album="ALB",
        duration_ms=1000,
        spotify_id=spot_id,
    )


def _summary(pid: str, name: str) -> PlaylistSummary:
    return PlaylistSummary(
        id=pid, name=name, description="d", track_count=1, owner_id="u", is_own=True
    )


# --- Playlist migration --------------------------------------------------


def test_migrate_playlist_records_fatal_in_report_and_continues(tmp_path):
    migrator, spotify, ytmusic = _make_migrator(tmp_path)

    spotify.get_current_user_id.return_value = "u"
    spotify.list_playlist_summaries.return_value = [
        _summary("p1", "First"),
        _summary("p2", "Second"),
    ]
    spotify.load_playlist_by_id.side_effect = lambda pid, name, desc: Playlist(
        id=pid, name=name, description=desc, tracks=[_track("Song", spot_id=pid + "_t")]
    )
    ytmusic.search_song.return_value = "VID_X"

    # First playlist hits a fatal in create_playlist; second succeeds.
    ytmusic.create_playlist.side_effect = [
        YTMusicFatalError("creation forbidden"),
        "PL_yt_2",
    ]
    ytmusic.add_tracks_to_playlist.return_value = None

    migrator.migrate_playlists()

    assert len(migrator.report.playlists) == 2
    failed, ok = migrator.report.playlists
    assert failed.name == "First"
    assert failed.yt_playlist_id is None
    assert failed.found == 0
    assert failed.error is not None
    assert "creation forbidden" in failed.error

    assert ok.name == "Second"
    assert ok.yt_playlist_id == "PL_yt_2"
    assert ok.error is None
    assert ok.found == 1


def test_migrate_playlist_records_transient_exhaustion_in_report(tmp_path):
    migrator, spotify, ytmusic = _make_migrator(tmp_path)

    spotify.get_current_user_id.return_value = "u"
    spotify.list_playlist_summaries.return_value = [_summary("p1", "Only")]
    spotify.load_playlist_by_id.return_value = Playlist(
        id="p1", name="Only", description="d", tracks=[_track("S")]
    )
    ytmusic.search_song.return_value = "VID_X"
    ytmusic.create_playlist.side_effect = YTMusicTransientError("retries done")

    migrator.migrate_playlists()

    [result] = migrator.report.playlists
    assert result.error is not None
    assert "transient" in result.error
    assert result.yt_playlist_id is None
    assert result.found == 0


def test_search_song_fatal_aborts_job(tmp_path):
    migrator, spotify, ytmusic = _make_migrator(tmp_path)

    spotify.get_current_user_id.return_value = "u"
    spotify.list_playlist_summaries.return_value = [_summary("p1", "Only")]
    spotify.load_playlist_by_id.return_value = Playlist(
        id="p1", name="Only", description="d", tracks=[_track("S", spot_id="t1")]
    )
    ytmusic.search_song.side_effect = YTMusicFatalError("auth expired")

    with pytest.raises(YTMusicFatalError, match="auth expired"):
        migrator.migrate_playlists()

    # The aborted playlist did not reach the report (we never got past the
    # track loop). The fact that the exception propagates is the contract.
    assert migrator.report.playlists == []


# --- Album migration -----------------------------------------------------


def test_migrate_album_records_fatal_from_save_in_report_and_continues(tmp_path):
    migrator, spotify, ytmusic = _make_migrator(tmp_path)

    spotify.get_saved_albums.return_value = [
        Album(name="In Rainbows", artist="Radiohead", spotify_id="a1"),
        Album(name="Currents", artist="Tame Impala", spotify_id="a2"),
    ]
    ytmusic.search_album.return_value = {"browseId": "BR"}
    ytmusic.save_album.side_effect = [
        YTMusicFatalError("forbidden"),
        True,
    ]

    migrator.migrate_albums()

    assert len(migrator.report.albums) == 2
    failed, ok = migrator.report.albums
    assert failed.label == "Radiohead - In Rainbows"
    assert failed.error is not None
    assert "forbidden" in failed.error
    assert ok.label == "Tame Impala - Currents"
    assert ok.error is None
    assert ok.status == "saved"


def test_migrate_album_records_fatal_from_search_in_report_and_continues(tmp_path):
    migrator, spotify, ytmusic = _make_migrator(tmp_path)

    spotify.get_saved_albums.return_value = [
        Album(name="In Rainbows", artist="Radiohead", spotify_id="a1"),
        Album(name="Currents", artist="Tame Impala", spotify_id="a2"),
    ]
    ytmusic.search_album.side_effect = [
        YTMusicFatalError("search forbidden"),
        {"browseId": "BR"},
    ]
    ytmusic.save_album.return_value = True

    migrator.migrate_albums()

    assert len(migrator.report.albums) == 2
    failed = migrator.report.albums[0]
    assert failed.label == "Radiohead - In Rainbows"
    assert failed.status == "not found"
    assert failed.error is not None
    assert "search forbidden" in failed.error

    ok = migrator.report.albums[1]
    assert ok.error is None
    assert ok.status == "saved"


# --- Failure events ------------------------------------------------------


def test_migrate_playlist_emits_creation_failed_event(tmp_path):
    events: list = []
    spotify = MagicMock()
    ytmusic = MagicMock()
    cache = TrackCache(tmp_path / "cache.json")
    migrator = Migrator(spotify=spotify, ytmusic=ytmusic, cache=cache, on_event=events.append)

    spotify.get_current_user_id.return_value = "u"
    spotify.list_playlist_summaries.return_value = [_summary("p1", "Broken")]
    spotify.load_playlist_by_id.return_value = Playlist(
        id="p1", name="Broken", description="d", tracks=[_track("S", spot_id="t1")]
    )
    ytmusic.search_song.return_value = "VID_X"
    ytmusic.create_playlist.side_effect = YTMusicFatalError("quota exceeded")

    migrator.migrate_playlists()

    creation_failed = [e for e in events if type(e).__name__ == "PlaylistCreationFailed"]
    assert len(creation_failed) == 1
    assert creation_failed[0].name == "Broken"
    assert "quota exceeded" in creation_failed[0].reason


def test_migrate_playlist_emits_chunk_failed_event(tmp_path):
    events: list = []
    spotify = MagicMock()
    ytmusic = MagicMock()
    cache = TrackCache(tmp_path / "cache.json")
    migrator = Migrator(spotify=spotify, ytmusic=ytmusic, cache=cache, on_event=events.append)

    spotify.get_current_user_id.return_value = "u"
    spotify.list_playlist_summaries.return_value = [_summary("p1", "ChunkFail")]
    spotify.load_playlist_by_id.return_value = Playlist(
        id="p1", name="ChunkFail", description="d", tracks=[_track("S", spot_id="t1")]
    )
    ytmusic.search_song.return_value = "VID_X"
    ytmusic.create_playlist.return_value = "PL_created"
    ytmusic.add_tracks_to_playlist.side_effect = YTMusicChunkError(
        chunk_index=0, total_chunks=1, reason="throttled"
    )

    migrator.migrate_playlists()

    chunk_failed = [e for e in events if type(e).__name__ == "PlaylistChunkFailed"]
    assert len(chunk_failed) == 1
    assert chunk_failed[0].name == "ChunkFail"
    assert chunk_failed[0].chunk_index == 0
    assert chunk_failed[0].total_chunks == 1


def test_migrate_album_emits_save_failed_event(tmp_path):
    events: list = []
    spotify = MagicMock()
    ytmusic = MagicMock()
    cache = TrackCache(tmp_path / "cache.json")
    migrator = Migrator(spotify=spotify, ytmusic=ytmusic, cache=cache, on_event=events.append)

    spotify.get_saved_albums.return_value = [
        Album(name="In Rainbows", artist="Radiohead", spotify_id="a1"),
    ]
    ytmusic.search_album.return_value = {"browseId": "BR"}
    ytmusic.save_album.side_effect = YTMusicFatalError("save forbidden")

    migrator.migrate_albums()

    save_failed = [e for e in events if type(e).__name__ == "AlbumSaveFailed"]
    assert len(save_failed) == 1
    assert save_failed[0].label == "Radiohead - In Rainbows"
    assert "save forbidden" in save_failed[0].reason
