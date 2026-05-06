"""Tests for the sidecar server entrypoint."""
from unittest.mock import patch

import pytest
from httpx import AsyncClient, ASGITransport

from spotify_to_ytmusic.api import create_app
from spotify_to_ytmusic.api.sidecar_server import _find_free_port


def test_find_free_port_returns_valid_port():
    port = _find_free_port()
    assert isinstance(port, int)
    assert 1024 <= port <= 65535


@pytest.mark.asyncio
async def test_sidecar_health_endpoint():
    """The sidecar server app responds to /api/health."""
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        with patch("spotify_to_ytmusic.api.routes.health._check_spotify", return_value=True), \
             patch("spotify_to_ytmusic.api.routes.health._check_ytmusic", return_value=True):
            resp = await c.get("/api/health")
            assert resp.status_code == 200
            data = resp.json()
            assert "ok" in data


def test_main_prints_server_listening(capfd):
    """main() prints SERVER_LISTENING port=<n> to stdout."""
    from spotify_to_ytmusic.api.sidecar_server import main

    with patch("sys.argv", ["sidecar_server", "0"]), \
         patch("spotify_to_ytmusic.api.sidecar_server.uvicorn.Server.run", return_value=None), \
         patch("spotify_to_ytmusic.api.sidecar_server._find_free_port", return_value=54321):
        main()
    captured = capfd.readouterr()
    assert "SERVER_LISTENING port=54321" in captured.out
