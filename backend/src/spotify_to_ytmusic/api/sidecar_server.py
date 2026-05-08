"""Entrypoint for the PyInstaller-packaged sidecar binary.

Reads the port from argv[1] (0 = random), starts uvicorn, and prints
``SERVER_LISTENING port=<n>`` to stdout so the Tauri host can discover it.
"""
import logging
import os
import socket
import sys
import threading
import time

from dotenv import load_dotenv

load_dotenv()

from spotify_to_ytmusic.api.routes.auth import load_persisted_credentials

load_persisted_credentials()

logging.getLogger("spotipy.client").setLevel(logging.CRITICAL)

import uvicorn

# Parent-watchdog tunables. Defense in depth for #98: if the Tauri host
# crashes or fails to fire its cleanup hooks, the sidecar self-terminates
# within at most _PARENT_POLL_S of the parent's death.
_PARENT_POLL_S = 2.0


def _is_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except OSError:
        # On Windows, EPERM means the process exists but we can't signal it.
        # On POSIX, EPERM means the same. Either way: alive.
        return True
    return True


def start_parent_watchdog(
    parent_pid: int,
    *,
    poll_interval_s: float = _PARENT_POLL_S,
    on_parent_death=None,
) -> threading.Thread | None:
    """Spawn a daemon thread that exits the process when ``parent_pid`` dies.

    Returns ``None`` (and does nothing) when the parent PID is not a real
    parent — eg. running under the CLI, where ``getppid()`` returns the
    shell. ``on_parent_death`` is injectable for unit tests; it defaults
    to ``os._exit(0)``.
    """
    if parent_pid <= 1:
        return None
    callback = on_parent_death or (lambda: os._exit(0))

    def _watch() -> None:
        while True:
            if not _is_alive(parent_pid):
                callback()
                return
            time.sleep(poll_interval_s)

    thread = threading.Thread(target=_watch, name="parent-watchdog", daemon=True)
    thread.start()
    return thread


def _find_free_port() -> int:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


def main() -> None:
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]}", file=sys.stderr)
            sys.exit(1)
    else:
        port = 8000

    if port == 0:
        port = _find_free_port()

    data_dir = os.environ.get("SPOTIFY_TO_YTMUSIC_DATA_DIR")
    if data_dir:
        os.makedirs(data_dir, exist_ok=True)

    os.makedirs("data", exist_ok=True)

    _secure_permissions(data_dir)

    from spotify_to_ytmusic.api import create_app

    app = create_app()

    config = uvicorn.Config(app=app, host="127.0.0.1", port=port, log_level="warning")
    server = uvicorn.Server(config)

    start_parent_watchdog(os.getppid())

    print(f"SERVER_LISTENING port={port}", flush=True)
    server.run()


def _secure_permissions(data_dir: str | None) -> None:
    """Set 0o600 on sensitive files when the platform supports it."""
    if os.name != "posix":
        return
    base = data_dir or "data"
    for name in (".cache", "browser.json"):
        path = os.path.join(base, name)
        if os.path.isfile(path):
            try:
                os.chmod(path, 0o600)
            except OSError:
                pass


if __name__ == "__main__":
    main()
