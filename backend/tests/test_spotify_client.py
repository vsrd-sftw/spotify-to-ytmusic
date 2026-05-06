"""Tests for SpotifyClient: payload shapes, pagination, 403 handling."""
import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from spotipy.exceptions import SpotifyException

from spotify_to_ytmusic.core.models import PlaylistSummary
from spotify_to_ytmusic.core.spotify_client import SpotifyClient

FIXTURES = Path(__file__).parent / "fixtures"


def _load_fixture(name: str) -> dict:
    with open(FIXTURES / name, encoding="utf-8") as f:
        return json.load(f)


def _make_client(mock_sp: MagicMock) -> SpotifyClient:
    client = object.__new__(SpotifyClient)
    client.sp = mock_sp
    return client


# --- list_playlist_summaries -----------------------------------------------


def test_list_playlist_summaries_uses_items_total():
    sp = MagicMock()
    sp.current_user_playlists.return_value = _load_fixture("current_user_playlists.json")
    client = _make_client(sp)

    summaries = client.list_playlist_summaries("user_123")

    assert len(summaries) == 3
    assert summaries[0] == PlaylistSummary(
        id="pl_001",
        name="Discover Weekly",
        description="Your weekly mixtape",
        track_count=30,
        owner_id="user_123",
        is_own=True,
    )
    assert summaries[2].is_own is False


def test_list_playlist_summaries_skips_none_items():
    sp = MagicMock()
    sp.current_user_playlists.return_value = {
        "items": [None, {"id": "p1", "name": "OK", "description": "", "owner": {"id": "u"}, "items": {"total": 1}}],
        "next": None,
    }
    client = _make_client(sp)

    summaries = client.list_playlist_summaries("u")
    assert len(summaries) == 1
    assert summaries[0].id == "p1"


# --- _build_track (new payload: item.item) --------------------------------


def test_build_track_new_payload():
    fixture = _load_fixture("playlist_tracks_new.json")
    track_item = fixture["items"][0]

    track = SpotifyClient._build_track(track_item)

    assert track is not None
    assert track.name == "Bohemian Rhapsody"
    assert track.artist == "Queen"
    assert track.album == "A Night at the Opera"
    assert track.duration_ms == 354947
    assert track.spotify_id == "track_001"


def test_build_track_new_payload_returns_none_for_null_item():
    fixture = _load_fixture("playlist_tracks_new.json")
    track_item = fixture["items"][2]

    assert SpotifyClient._build_track(track_item) is None


# --- _build_track (legacy payload: item.track) ----------------------------


def test_build_track_legacy_payload():
    fixture = _load_fixture("playlist_tracks_legacy.json")
    track_item = fixture["items"][0]

    track = SpotifyClient._build_track(track_item)

    assert track is not None
    assert track.name == "Hotel California"
    assert track.artist == "Eagles"
    assert track.spotify_id == "track_101"


def test_build_track_legacy_returns_none_for_null_track():
    fixture = _load_fixture("playlist_tracks_legacy.json")
    track_item = fixture["items"][1]

    assert SpotifyClient._build_track(track_item) is None


# --- _get_playlist_tracks pagination --------------------------------------


def test_get_playlist_tracks_paginates():
    sp = MagicMock()
    page1 = {
        "items": [{"item": {"id": "t1", "name": "A", "artists": [{"name": "B"}], "album": {"name": "C"}, "duration_ms": 100}}],
        "next": "https://api.spotify.com/v1/playlists/p1/tracks?offset=1",
    }
    page2 = {
        "items": [{"item": {"id": "t2", "name": "D", "artists": [{"name": "E"}], "album": {"name": "F"}, "duration_ms": 200}}],
        "next": None,
    }
    sp.playlist_tracks.return_value = page1
    sp.next.side_effect = [page2]

    client = _make_client(sp)
    tracks = client._get_playlist_tracks("p1")

    assert len(tracks) == 2
    assert tracks[0].spotify_id == "t1"
    assert tracks[1].spotify_id == "t2"
    assert sp.playlist_tracks.call_count == 1
    assert sp.next.call_count == 1


# --- load_playlist_by_id 403 → None ---------------------------------------


def test_load_playlist_by_id_returns_none_on_403():
    sp = MagicMock()
    sp.playlist_tracks.side_effect = SpotifyException(403, -1, "Forbidden")

    client = _make_client(sp)
    result = client.load_playlist_by_id("p1", "Secret", "desc")

    assert result is None


def test_load_playlist_by_id_reraises_non_403():
    sp = MagicMock()
    sp.playlist_tracks.side_effect = SpotifyException(500, -1, "Server error")

    client = _make_client(sp)

    with pytest.raises(SpotifyException, match="Server error"):
        client.load_playlist_by_id("p1", "Broken", "desc")


# --- get_saved_albums -----------------------------------------------------


def test_get_saved_albums():
    sp = MagicMock()
    sp.current_user_saved_albums.return_value = _load_fixture("current_user_saved_albums.json")

    client = _make_client(sp)
    albums = client.get_saved_albums()

    assert len(albums) == 2
    assert albums[0].name == "In Rainbows"
    assert albums[0].artist == "Radiohead"
    assert albums[0].spotify_id == "album_001"
    assert albums[1].name == "Currents"
