"""Entrypoint for the PyInstaller-packaged sidecar binary.

Reads the port from argv[1] (0 = random), starts uvicorn, and prints
``SERVER_LISTENING port=<n>`` to stdout so the Tauri host can discover it.
"""
import os
import socket
import sys

import uvicorn


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
