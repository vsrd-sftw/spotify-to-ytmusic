"""Integration tests for /api/auth routes."""
from unittest.mock import patch, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from spotify_to_ytmusic.api import create_app
from spotify_to_ytmusic.api.state import state_store


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture(autouse=True)
def _clear_state():
    state_store._store.clear()
    yield
    state_store._store.clear()


@pytest.mark.asyncio
async def test_auth_spotify_returns_url(client, monkeypatch):
    monkeypatch.setenv("SPOTIFY_CLIENT_ID", "test")
    monkeypatch.setenv("SPOTIFY_CLIENT_SECRET", "test")
    with patch("spotify_to_ytmusic.api.routes.auth._get_spotify_oauth") as mock_oauth:
        oauth = MagicMock()
        oauth.get_authorize_url.return_value = "https://accounts.spotify.com/authorize?state=test"
        mock_oauth.return_value = oauth

        resp = await client.post("/api/auth/spotify")
        assert resp.status_code == 200
        data = resp.json()
        assert "url" in data
        assert "accounts.spotify.com" in data["url"]


@pytest.mark.asyncio
async def test_auth_spotify_stores_state(client, monkeypatch):
    monkeypatch.setenv("SPOTIFY_CLIENT_ID", "test")
    monkeypatch.setenv("SPOTIFY_CLIENT_SECRET", "test")
    with patch("spotify_to_ytmusic.api.routes.auth._get_spotify_oauth") as mock_oauth:
        oauth = MagicMock()
        oauth.get_authorize_url.return_value = "https://accounts.spotify.com/authorize?state=xyz"
        mock_oauth.return_value = oauth

        await client.post("/api/auth/spotify")
        assert len(state_store._store) == 1


@pytest.mark.asyncio
async def test_auth_spotify_callback_invalid_state(client):
    resp = await client.get("/api/auth/spotify/callback", params={"code": "abc", "state": "nonexistent"})
    assert resp.status_code == 400
    assert "Estado de autenticación" in resp.text


@pytest.mark.asyncio
async def test_auth_spotify_callback_valid_state(client):
    state_store.set("valid-state", ttl_seconds=600, redirect_uri="http://127.0.0.1:8000/api/auth/spotify/callback")
    with patch("spotify_to_ytmusic.api.routes.auth._get_spotify_oauth") as mock_oauth:
        oauth = MagicMock()
        mock_oauth.return_value = oauth

        resp = await client.get(
            "/api/auth/spotify/callback",
            params={"code": "abc", "state": "valid-state"},
        )
        assert resp.status_code == 200
        assert "Conectado" in resp.text
        oauth.get_access_token.assert_called_once_with("abc", as_dict=True, check_cache=False)


@pytest.mark.asyncio
async def test_auth_ytmusic_valid_headers(client, tmp_path):
    browser_file = tmp_path / "browser.json"
    with patch("spotify_to_ytmusic.api.routes.auth.BROWSER_AUTH_FILE", str(browser_file)), \
         patch("ytmusicapi.auth.browser.setup_browser") as mock_setup:
        resp = await client.post(
            "/api/auth/ytmusic",
            json={
                "headers": "cookie: ABC\nuser-agent: Mozilla/5.0\nx-goog-authuser: 1"
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        mock_setup.assert_called_once()


@pytest.mark.asyncio
async def test_auth_ytmusic_missing_x_goog_authuser(client):
    resp = await client.post(
        "/api/auth/ytmusic",
        json={"headers": "cookie: ABC\nuser-agent: Mozilla/5.0"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "x-goog-authuser" in data["message"].lower()


@pytest.mark.asyncio
async def test_auth_ytmusic_missing_cookie(client):
    resp = await client.post(
        "/api/auth/ytmusic",
        json={"headers": "user-agent: Mozilla/5.0"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_auth_ytmusic_missing_user_agent(client):
    resp = await client.post(
        "/api/auth/ytmusic",
        json={"headers": "cookie: ABC"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_auth_ytmusic_empty_headers(client):
    resp = await client.post(
        "/api/auth/ytmusic",
        json={"headers": ""},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_spotify_setup_get_unconfigured(client, tmp_path):
    creds_file = tmp_path / "spotify_credentials.json"
    with patch("spotify_to_ytmusic.api.routes.auth.SPOTIFY_CREDENTIALS_FILE", str(creds_file)):
        resp = await client.get("/api/auth/spotify/setup")
        assert resp.status_code == 200
        data = resp.json()
        assert data["configured"] is False


@pytest.mark.asyncio
async def test_spotify_setup_save_and_get_configured(client, tmp_path):
    creds_file = tmp_path / "spotify_credentials.json"
    with patch("spotify_to_ytmusic.api.routes.auth.SPOTIFY_CREDENTIALS_FILE", str(creds_file)):
        resp = await client.post(
            "/api/auth/spotify/setup",
            json={"client_id": "myid", "client_secret": "mysecret"},
        )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        assert creds_file.exists()

        resp = await client.get("/api/auth/spotify/setup")
        assert resp.json()["configured"] is True

        resp = await client.delete("/api/auth/spotify/setup")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        assert not creds_file.exists()

        resp = await client.get("/api/auth/spotify/setup")
        assert resp.json()["configured"] is False


@pytest.mark.asyncio
async def test_spotify_setup_delete_idempotent(client, tmp_path):
    creds_file = tmp_path / "spotify_credentials.json"
    with patch("spotify_to_ytmusic.api.routes.auth.SPOTIFY_CREDENTIALS_FILE", str(creds_file)):
        resp = await client.delete("/api/auth/spotify/setup")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True


@pytest.mark.asyncio
async def test_spotify_setup_save_missing_fields(client, tmp_path):
    creds_file = tmp_path / "spotify_credentials.json"
    with patch("spotify_to_ytmusic.api.routes.auth.SPOTIFY_CREDENTIALS_FILE", str(creds_file)):
        resp = await client.post(
            "/api/auth/spotify/setup",
            json={"client_id": "", "client_secret": ""},
        )
        assert resp.status_code == 200
        assert "message" in resp.json()
        assert not creds_file.exists()


@pytest.mark.asyncio
async def test_spotify_setup_delete_clears_env_vars(client, tmp_path, monkeypatch):
    creds_file = tmp_path / "spotify_credentials.json"
    monkeypatch.setenv("SPOTIFY_CLIENT_ID", "env_id")
    monkeypatch.setenv("SPOTIFY_CLIENT_SECRET", "env_secret")
    with patch("spotify_to_ytmusic.api.routes.auth.SPOTIFY_CREDENTIALS_FILE", str(creds_file)):
        await client.post(
            "/api/auth/spotify/setup",
            json={"client_id": "myid", "client_secret": "mysecret"},
        )
        import os
        assert os.environ.get("SPOTIFY_CLIENT_ID") == "myid"

        await client.delete("/api/auth/spotify/setup")
        assert os.environ.get("SPOTIFY_CLIENT_ID") is None
        assert os.environ.get("SPOTIFY_CLIENT_SECRET") is None
