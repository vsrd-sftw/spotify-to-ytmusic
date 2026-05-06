"""Integration tests for /api/migrate and WS /api/migrate/:jobId/events."""
import asyncio
from unittest.mock import patch, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport
from starlette.testclient import TestClient

from spotify_to_ytmusic.api import create_app
from spotify_to_ytmusic.api.jobs import registry
import spotify_to_ytmusic.api.dependencies as deps


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture(autouse=True)
def _clear_registry():
    registry._jobs.clear()
    yield
    registry._jobs.clear()


@pytest.fixture(autouse=True)
def _reset_spotify_singleton():
    deps._spotify_client = None
    yield
    deps._spotify_client = None


@pytest.mark.asyncio
async def test_start_migration_returns_201(client):
    with patch("spotify_to_ytmusic.api.routes.migrate._run_migration"):
        resp = await client.post(
            "/api/migrate",
            json={"playlistIds": ["pl_1"], "albumIds": []},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "jobId" in data
        assert len(data["jobId"]) == 32


@pytest.mark.asyncio
async def test_start_migration_409_when_job_running(client):
    registry.register("existing-job", asyncio.Queue())
    resp = await client.post(
        "/api/migrate",
        json={"playlistIds": ["pl_1"], "albumIds": []},
    )
    assert resp.status_code == 409
    data = resp.json()
    assert "message" in data["detail"]


@pytest.mark.asyncio
async def test_start_migration_camel_case(client):
    with patch("spotify_to_ytmusic.api.routes.migrate._run_migration"):
        resp = await client.post(
            "/api/migrate",
            json={"playlistIds": ["pl_1"], "albumIds": []},
        )
        data = resp.json()
        assert "jobId" in data


def test_ws_unknown_job_id_closes_4404(app):
    with TestClient(app) as tc:
        with pytest.raises(Exception):
            with tc.websocket_connect("/api/migrate/nonexistent/events") as ws:
                ws.receive_text()


def test_ws_delivers_events_and_closes_on_finished(app):
    job_id = "test-job-123"
    queue: asyncio.Queue = asyncio.Queue()
    registry.register(job_id, queue)

    from spotify_to_ytmusic.core.events import (
        PlaylistsDiscovered,
        MigrationFinished,
    )

    with TestClient(app) as tc:
        with tc.websocket_connect(f"/api/migrate/{job_id}/events") as ws:
            queue.put_nowait(PlaylistsDiscovered(count=2))
            queue.put_nowait(MigrationFinished(report_id="20260306_141532"))

            msg1 = ws.receive_json()
            assert msg1["type"] == "PlaylistsDiscovered"
            assert msg1["count"] == 2

            msg2 = ws.receive_json()
            assert msg2["type"] == "MigrationFinished"
            assert msg2["reportId"] == "20260306_141532"
