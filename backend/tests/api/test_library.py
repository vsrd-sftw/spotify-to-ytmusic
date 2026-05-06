"""Integration tests for /api/playlists and /api/albums."""
from unittest.mock import patch, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from spotify_to_ytmusic.api import create_app
from spotify_to_ytmusic.core.models import PlaylistSummary, Album


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_spotify_singleton():
    import spotify_to_ytmusic.api.dependencies as deps
    deps._spotify_client = None
    yield
    deps._spotify_client = None


def _mock_spotify_client():
    client = MagicMock()
    client.get_current_user_id.return_value = "test_user"
    client.list_playlist_summaries.return_value = [
        PlaylistSummary(
            id="pl_1",
            name="My Playlist",
            description="A test playlist",
            track_count=10,
            owner_id="test_user",
            is_own=True,
        ),
        PlaylistSummary(
            id="pl_2",
            name="Collab",
            description="",
            track_count=5,
            owner_id="other_user",
            is_own=False,
        ),
    ]
    client.get_saved_albums.return_value = [
        Album(name="In Rainbows", artist="Radiohead", spotify_id="alb_1"),
        Album(name="Currents", artist="Tame Impala", spotify_id="alb_2"),
    ]
    return client


@pytest.mark.asyncio
async def test_get_playlists_returns_200(client):
    mock_client = _mock_spotify_client()
    with patch("spotify_to_ytmusic.api.dependencies.SpotifyClient", return_value=mock_client):
        resp = await client.get("/api/playlists")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["id"] == "pl_1"
        assert data[0]["name"] == "My Playlist"
        assert data[0]["trackCount"] == 10
        assert data[0]["isOwn"] is True


@pytest.mark.asyncio
async def test_get_playlists_camel_case(client):
    mock_client = _mock_spotify_client()
    with patch("spotify_to_ytmusic.api.dependencies.SpotifyClient", return_value=mock_client):
        resp = await client.get("/api/playlists")
        data = resp.json()
        for item in data:
            assert "trackCount" in item
            assert "ownerId" in item
            assert "isOwn" in item


@pytest.mark.asyncio
async def test_get_playlists_401_on_auth_failure(client):
    with patch(
        "spotify_to_ytmusic.api.dependencies.SpotifyClient",
        side_effect=Exception("No credentials"),
    ):
        resp = await client.get("/api/playlists")
        assert resp.status_code == 401
        data = resp.json()
        assert "message" in data["detail"]


@pytest.mark.asyncio
async def test_get_albums_returns_200(client):
    mock_client = _mock_spotify_client()
    with patch("spotify_to_ytmusic.api.dependencies.SpotifyClient", return_value=mock_client):
        resp = await client.get("/api/albums")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["name"] == "In Rainbows"
        assert data[0]["artist"] == "Radiohead"
        assert data[0]["spotifyId"] == "alb_1"


@pytest.mark.asyncio
async def test_get_albums_camel_case(client):
    mock_client = _mock_spotify_client()
    with patch("spotify_to_ytmusic.api.dependencies.SpotifyClient", return_value=mock_client):
        resp = await client.get("/api/albums")
        data = resp.json()
        for item in data:
            assert "spotifyId" in item


@pytest.mark.asyncio
async def test_get_albums_401_on_auth_failure(client):
    with patch(
        "spotify_to_ytmusic.api.dependencies.SpotifyClient",
        side_effect=Exception("No credentials"),
    ):
        resp = await client.get("/api/albums")
        assert resp.status_code == 401
        data = resp.json()
        assert "message" in data["detail"]
