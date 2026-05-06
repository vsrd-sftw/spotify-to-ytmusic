"""Tests for YTMusicClient: typed exceptions, transient retry, fatal propagation."""
import json

import pytest
import requests
from ytmusicapi.exceptions import YTMusicServerError, YTMusicUserError

from spotify_to_ytmusic.core.ytmusic_client import (
    YTMusicFatalError,
    YTMusicTransientError,
    _classify_exception,
)


# --- _classify_exception -------------------------------------------------


def test_classify_jsondecode_is_transient():
    exc = json.JSONDecodeError("Expecting value", "", 0)
    assert _classify_exception(exc) is YTMusicTransientError


def test_classify_connection_error_is_transient():
    assert (
        _classify_exception(requests.exceptions.ConnectionError("dns fail"))
        is YTMusicTransientError
    )


def test_classify_timeout_is_transient():
    assert (
        _classify_exception(requests.exceptions.Timeout("slow"))
        is YTMusicTransientError
    )


def test_classify_http_5xx_is_transient():
    response = requests.Response()
    response.status_code = 503
    err = requests.exceptions.HTTPError(response=response)
    assert _classify_exception(err) is YTMusicTransientError


def test_classify_http_4xx_is_fatal():
    response = requests.Response()
    response.status_code = 401
    err = requests.exceptions.HTTPError(response=response)
    assert _classify_exception(err) is YTMusicFatalError


def test_classify_user_error_is_fatal():
    assert _classify_exception(YTMusicUserError("bad request")) is YTMusicFatalError


def test_classify_server_error_is_transient():
    assert _classify_exception(YTMusicServerError("500")) is YTMusicTransientError


def test_classify_unknown_is_fatal():
    assert _classify_exception(ValueError("???")) is YTMusicFatalError


# --- create_playlist -----------------------------------------------------


def test_create_playlist_propagates_fatal_when_yt_create_raises_user_error(
    ytmusic_client,
):
    ytmusic_client.yt.create_playlist.side_effect = YTMusicUserError("forbidden")
    with pytest.raises(YTMusicFatalError, match="Failed to create playlist"):
        ytmusic_client.create_playlist("My PL", "desc", ["v1"])


def test_create_playlist_propagates_fatal_when_id_is_empty(ytmusic_client):
    ytmusic_client.yt.create_playlist.return_value = ""
    with pytest.raises(YTMusicFatalError, match="invalid id"):
        ytmusic_client.create_playlist("My PL", "desc", ["v1"])


def test_create_playlist_propagates_fatal_when_id_is_dict(ytmusic_client):
    # ytmusicapi sometimes returns a status dict instead of an id on failure.
    ytmusic_client.yt.create_playlist.return_value = {"status": "STATUS_FAILED"}
    with pytest.raises(YTMusicFatalError, match="invalid id"):
        ytmusic_client.create_playlist("My PL", "desc", ["v1"])


def test_create_playlist_succeeds_when_chunk_throws_then_recovers(ytmusic_client):
    ytmusic_client.yt.create_playlist.return_value = "PL_real"
    # First add attempt: transient JSONDecodeError. Second: success.
    ytmusic_client.yt.add_playlist_items.side_effect = [
        json.JSONDecodeError("Expecting value", "", 0),
        {"status": "STATUS_SUCCEEDED"},
    ]
    pid = ytmusic_client.create_playlist("PL", "d", ["v1", "v2"])
    assert pid == "PL_real"
    assert ytmusic_client.yt.add_playlist_items.call_count == 2


def test_create_playlist_propagates_fatal_from_chunk_immediately(ytmusic_client):
    """A fatal during add_playlist_items must NOT burn the retry budget."""
    ytmusic_client.yt.create_playlist.return_value = "PL_real"
    ytmusic_client.yt.add_playlist_items.side_effect = YTMusicUserError("forbidden")
    with pytest.raises(YTMusicFatalError, match="Failed to add chunk"):
        ytmusic_client.create_playlist("PL", "d", ["v1"])
    # Exactly one call: classified fatal, raised on first attempt.
    assert ytmusic_client.yt.add_playlist_items.call_count == 1


# --- _add_chunk_with_retry -----------------------------------------------


def test_add_chunk_raises_transient_after_max_retries(ytmusic_client):
    # add_playlist_items keeps returning a non-success body — exhausts retries.
    ytmusic_client.yt.add_playlist_items.return_value = None
    with pytest.raises(YTMusicTransientError, match="exhausted retries"):
        ytmusic_client._add_chunk_with_retry("PL", ["v1"])
    # Default YTMUSIC_ADD_ITEMS_MAX_RETRIES = 5
    assert ytmusic_client.yt.add_playlist_items.call_count == 5


def test_add_chunk_recovers_after_one_transient_failure(ytmusic_client):
    ytmusic_client.yt.add_playlist_items.side_effect = [
        requests.exceptions.ConnectionError("blip"),
        {"status": "STATUS_SUCCEEDED"},
    ]
    # Should not raise.
    ytmusic_client._add_chunk_with_retry("PL", ["v1"])
    assert ytmusic_client.yt.add_playlist_items.call_count == 2


# --- save_album ----------------------------------------------------------


def test_save_album_recovers_from_transient(ytmusic_client):
    ytmusic_client.yt.get_album.side_effect = [
        json.JSONDecodeError("Expecting value", "", 0),
        {"audioPlaylistId": "AP_1"},
    ]
    ytmusic_client.yt.rate_playlist.return_value = None
    assert ytmusic_client.save_album("BR_1") is True
    assert ytmusic_client.yt.get_album.call_count == 2
    ytmusic_client.yt.rate_playlist.assert_called_once_with("AP_1", "LIKE")


def test_save_album_returns_false_when_no_audio_playlist_id(ytmusic_client):
    ytmusic_client.yt.get_album.return_value = {"audioPlaylistId": None}
    assert ytmusic_client.save_album("BR_1") is False
    ytmusic_client.yt.rate_playlist.assert_not_called()


def test_save_album_propagates_fatal(ytmusic_client):
    ytmusic_client.yt.get_album.side_effect = YTMusicUserError("forbidden")
    with pytest.raises(YTMusicFatalError, match="Failed to save album"):
        ytmusic_client.save_album("BR_1")
    assert ytmusic_client.yt.get_album.call_count == 1


def test_save_album_raises_transient_after_max_retries(ytmusic_client):
    ytmusic_client.yt.get_album.side_effect = (
        requests.exceptions.ConnectionError("blip")
    )
    with pytest.raises(YTMusicTransientError, match="exhausted retries"):
        ytmusic_client.save_album("BR_1")
    assert ytmusic_client.yt.get_album.call_count == 5


# --- _search_with_retries ------------------------------------------------


def test_search_skips_query_on_transient_then_returns_match(ytmusic_client):
    """First query throws transient, second query succeeds with a match."""
    ytmusic_client.yt.search.side_effect = [
        requests.exceptions.ConnectionError("blip"),
        [
            {
                "videoId": "VID_1",
                "artists": [{"name": "Radiohead"}],
            }
        ],
    ]
    result = ytmusic_client.search_song("Karma Police", "Radiohead")
    assert result == "VID_1"
    assert ytmusic_client.yt.search.call_count == 2


def test_search_propagates_fatal_immediately(ytmusic_client):
    ytmusic_client.yt.search.side_effect = YTMusicUserError("forbidden")
    with pytest.raises(YTMusicFatalError, match="Search failed"):
        ytmusic_client.search_song("Karma Police", "Radiohead")
    # Stopped on the first query — fatal short-circuits.
    assert ytmusic_client.yt.search.call_count == 1


def test_search_returns_none_when_all_queries_transient(ytmusic_client):
    """If every query variant fails transient, return None (no match)."""
    ytmusic_client.yt.search.side_effect = (
        requests.exceptions.ConnectionError("blip")
    )
    assert ytmusic_client.search_song("Karma Police", "Radiohead") is None
    # _build_queries dedups; with this artist/title it produces 3 variants.
    assert ytmusic_client.yt.search.call_count >= 1
