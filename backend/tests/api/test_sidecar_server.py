"""Tests for the sidecar server entrypoint."""
import threading
import time
from unittest.mock import patch

import pytest
from httpx import AsyncClient, ASGITransport

from spotify_to_ytmusic.api import create_app
from spotify_to_ytmusic.api.sidecar_server import (
    _find_free_port,
    _is_alive,
    start_parent_watchdog,
)


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
         patch("spotify_to_ytmusic.api.sidecar_server._find_free_port", return_value=54321), \
         patch("spotify_to_ytmusic.api.sidecar_server.start_parent_watchdog", return_value=None):
        main()
    captured = capfd.readouterr()
    assert "SERVER_LISTENING port=54321" in captured.out


def test_parent_watchdog_skips_when_pid_is_root_or_init():
    """Init/root PIDs (<=1) are sentinels for "no real parent" — don't watch."""
    fired = threading.Event()
    assert start_parent_watchdog(0, on_parent_death=fired.set) is None
    assert start_parent_watchdog(1, on_parent_death=fired.set) is None
    assert not fired.is_set()


def test_parent_watchdog_fires_when_parent_dies():
    """When the parent PID stops being alive, the death callback runs."""
    fired = threading.Event()
    alive_calls = {"n": 0}

    def fake_is_alive(_pid: int) -> bool:
        alive_calls["n"] += 1
        return alive_calls["n"] < 2  # alive on first poll, dead on second

    with patch("spotify_to_ytmusic.api.sidecar_server._is_alive", side_effect=fake_is_alive):
        thread = start_parent_watchdog(
            1234,
            poll_interval_s=0.01,
            initial_delay_s=0.0,
            on_parent_death=fired.set,
        )
        assert thread is not None
        assert fired.wait(timeout=2.0), "watchdog should have fired exit callback"


def test_parent_watchdog_stays_quiet_while_parent_alive():
    """If the parent is alive, the death callback never runs."""
    fired = threading.Event()

    with patch("spotify_to_ytmusic.api.sidecar_server._is_alive", return_value=True):
        thread = start_parent_watchdog(
            1234,
            poll_interval_s=0.01,
            initial_delay_s=0.0,
            on_parent_death=fired.set,
        )
        assert thread is not None
        time.sleep(0.05)
        assert not fired.is_set()


def test_parent_watchdog_honors_initial_delay():
    """During the initial delay no probe happens, so death is reported late."""
    fired = threading.Event()

    with patch("spotify_to_ytmusic.api.sidecar_server._is_alive", return_value=False):
        start_parent_watchdog(
            1234,
            poll_interval_s=0.01,
            initial_delay_s=0.2,
            on_parent_death=fired.set,
        )
        assert not fired.is_set()
        # After the initial delay elapses the first probe runs and fires.
        assert fired.wait(timeout=1.0)


def test_is_alive_for_current_process():
    """Sanity check: the test runner's own PID is alive."""
    import os as _os

    assert _is_alive(_os.getpid())


def test_is_alive_returns_false_for_unused_pid():
    """A wildly-out-of-range PID should be reported as dead, not alive."""
    # 4_294_967_294 is just under DWORD max; should never be a valid PID.
    assert _is_alive(4_294_967_294) is False
