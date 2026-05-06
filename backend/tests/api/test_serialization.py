"""Tests for event serialization."""
from spotify_to_ytmusic.api.serialization import serialize_event
from spotify_to_ytmusic.core.events import (
    AlbumProcessed,
    AlbumsDiscovered,
    MigrationFinished,
    PlaylistFinished,
    PlaylistStarted,
    PlaylistsDiscovered,
)


def test_serialize_playlists_discovered():
    event = PlaylistsDiscovered(count=3)
    result = serialize_event(event)
    assert result == {"type": "PlaylistsDiscovered", "count": 3}


def test_serialize_playlist_started():
    event = PlaylistStarted(name="My Mix", track_count=42)
    result = serialize_event(event)
    assert result == {"type": "PlaylistStarted", "name": "My Mix", "trackCount": 42}


def test_serialize_playlist_finished():
    event = PlaylistFinished(
        name="My Mix",
        found=40,
        total=42,
        not_found_labels=["Track A", "Track B"],
    )
    result = serialize_event(event)
    assert result["type"] == "PlaylistFinished"
    assert result["name"] == "My Mix"
    assert result["found"] == 40
    assert result["total"] == 42
    assert result["notFoundLabels"] == ["Track A", "Track B"]


def test_serialize_album_processed():
    event = AlbumProcessed(label="Radiohead - In Rainbows", status="saved")
    result = serialize_event(event)
    assert result == {
        "type": "AlbumProcessed",
        "label": "Radiohead - In Rainbows",
        "status": "saved",
    }


def test_serialize_albums_discovered():
    event = AlbumsDiscovered(count=2)
    result = serialize_event(event)
    assert result == {"type": "AlbumsDiscovered", "count": 2}


def test_serialize_migration_finished():
    event = MigrationFinished(report_id="20260306_141532")
    result = serialize_event(event)
    assert result == {"type": "MigrationFinished", "reportId": "20260306_141532"}
