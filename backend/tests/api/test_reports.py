"""Integration tests for /api/reports, /api/reports/:id, and DELETE /api/reports/:id."""
import json
from pathlib import Path
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


@pytest.fixture
def report_dir(tmp_path: Path) -> Path:
    r1 = tmp_path / "migration_report_20260306_141532.json"
    r1.write_text(json.dumps({
        "playlists": [
            {"name": "Mix 1", "total": 10, "found": 8, "yt_playlist_id": "PL_abc", "error": None}
        ],
        "albums": [{"label": "Radiohead - In Rainbows", "status": "saved", "error": None}],
        "not_found": [{"context": "Mix 1", "item": "Unknown - Track"}],
    }))
    r2 = tmp_path / "migration_report_20260305_100000.json"
    r2.write_text(json.dumps({
        "playlists": [],
        "albums": [],
        "not_found": [],
    }))
    return tmp_path


@pytest.mark.asyncio
async def test_get_reports_returns_list(client, report_dir):
    with patch("spotify_to_ytmusic.api.routes.reports.list_reports") as mock_list:
        from spotify_to_ytmusic.core.models import (
            MigrationReport,
            PlaylistMigrationResult,
            AlbumMigrationResult,
            MissingItem,
        )
        mock_list.return_value = [
            MigrationReport(
                id="20260306_141532",
                playlists=[
                    PlaylistMigrationResult(
                        name="Mix 1", total=10, found=8, yt_playlist_id="PL_abc", error=None
                    )
                ],
                albums=[AlbumMigrationResult(label="Radiohead - In Rainbows", status="saved", error=None)],
                not_found=[MissingItem(context="Mix 1", item="Unknown - Track")],
            ),
            MigrationReport(
                id="20260305_100000",
                playlists=[],
                albums=[],
                not_found=[],
            ),
        ]
        resp = await client.get("/api/reports")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["id"] == "20260306_141532"
        assert data[1]["id"] == "20260305_100000"


@pytest.mark.asyncio
async def test_get_reports_empty(client):
    with patch("spotify_to_ytmusic.api.routes.reports.list_reports", return_value=[]):
        resp = await client.get("/api/reports")
        assert resp.status_code == 200
        data = resp.json()
        assert data == []


@pytest.mark.asyncio
async def test_get_reports_camel_case(client):
    with patch("spotify_to_ytmusic.api.routes.reports.list_reports") as mock_list:
        from spotify_to_ytmusic.core.models import (
            MigrationReport,
            PlaylistMigrationResult,
            AlbumMigrationResult,
            MissingItem,
        )
        mock_list.return_value = [
            MigrationReport(
                id="20260306_141532",
                playlists=[
                    PlaylistMigrationResult(
                        name="Mix 1", total=10, found=8, yt_playlist_id="PL_abc", error=None
                    )
                ],
                albums=[AlbumMigrationResult(label="Radiohead - In Rainbows", status="saved", error=None)],
                not_found=[MissingItem(context="Mix 1", item="Unknown - Track")],
            ),
        ]
        resp = await client.get("/api/reports")
        data = resp.json()
        item = data[0]
        assert "ytPlaylistId" in item["playlists"][0]
        assert "notFound" in item


@pytest.mark.asyncio
async def test_get_report_by_id(client):
    with patch("spotify_to_ytmusic.api.routes.reports.load_report") as mock_load:
        from spotify_to_ytmusic.core.models import MigrationReport
        mock_load.return_value = MigrationReport(
            id="20260306_141532",
            playlists=[],
            albums=[],
            not_found=[],
        )
        resp = await client.get("/api/reports/20260306_141532")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "20260306_141532"


@pytest.mark.asyncio
async def test_get_report_by_id_404(client):
    with patch("spotify_to_ytmusic.api.routes.reports.load_report", return_value=None):
        resp = await client.get("/api/reports/nonexistent")
        assert resp.status_code == 404
        data = resp.json()
        assert "message" in data["detail"]


@pytest.mark.asyncio
async def test_delete_report_returns_200(client):
    with patch("spotify_to_ytmusic.api.routes.reports.delete_report", return_value=True):
        resp = await client.delete("/api/reports/20260306_141532")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True


@pytest.mark.asyncio
async def test_delete_report_returns_404(client):
    with patch("spotify_to_ytmusic.api.routes.reports.delete_report", return_value=False):
        resp = await client.delete("/api/reports/nonexistent")
        assert resp.status_code == 404
        data = resp.json()
        assert "message" in data["detail"]
