"""Integration tests for /api/health."""
from unittest.mock import patch

import pytest
from httpx import AsyncClient, ASGITransport

from spotify_to_ytmusic.api import create_app


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_health_both_ok(client, tmp_path):
    cache_file = tmp_path / ".cache"
    browser_file = tmp_path / "browser.json"
    cache_file.write_text("{}")
    browser_file.write_text("{}")

    with patch("spotify_to_ytmusic.api.routes.health.SPOTIFY_TOKEN_CACHE_FILE", str(cache_file)), \
         patch("spotify_to_ytmusic.api.routes.health.BROWSER_AUTH_FILE", str(browser_file)), \
         patch("spotify_to_ytmusic.api.routes.health._check_spotify", return_value=True), \
         patch("spotify_to_ytmusic.api.routes.health._check_ytmusic", return_value=True):
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["spotify"] is True
        assert data["ytmusic"] is True


@pytest.mark.asyncio
async def test_health_spotify_only(client):
    with patch("spotify_to_ytmusic.api.routes.health._check_spotify", return_value=True), \
         patch("spotify_to_ytmusic.api.routes.health._check_ytmusic", return_value=False):
        resp = await client.get("/api/health")
        data = resp.json()
        assert data["ok"] is False
        assert data["spotify"] is True
        assert data["ytmusic"] is False


@pytest.mark.asyncio
async def test_health_ytmusic_only(client):
    with patch("spotify_to_ytmusic.api.routes.health._check_spotify", return_value=False), \
         patch("spotify_to_ytmusic.api.routes.health._check_ytmusic", return_value=True):
        resp = await client.get("/api/health")
        data = resp.json()
        assert data["ok"] is False
        assert data["spotify"] is False
        assert data["ytmusic"] is True


@pytest.mark.asyncio
async def test_health_neither(client):
    with patch("spotify_to_ytmusic.api.routes.health._check_spotify", return_value=False), \
         patch("spotify_to_ytmusic.api.routes.health._check_ytmusic", return_value=False):
        resp = await client.get("/api/health")
        data = resp.json()
        assert data["ok"] is False
        assert data["spotify"] is False
        assert data["ytmusic"] is False


@pytest.mark.asyncio
async def test_health_camel_case(client):
    with patch("spotify_to_ytmusic.api.routes.health._check_spotify", return_value=True), \
         patch("spotify_to_ytmusic.api.routes.health._check_ytmusic", return_value=True):
        resp = await client.get("/api/health")
        data = resp.json()
        assert "ok" in data
        assert "spotify" in data
        assert "ytmusic" in data
