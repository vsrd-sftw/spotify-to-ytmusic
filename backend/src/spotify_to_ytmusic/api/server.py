"""Entrypoint: python -m spotify_to_ytmusic.api.server"""
import sys

from dotenv import load_dotenv

load_dotenv()

import uvicorn


def main() -> None:
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]}", file=sys.stderr)
            sys.exit(1)
    print(f"Starting API server on http://127.0.0.1:{port}")
    uvicorn.run("spotify_to_ytmusic.api:app", host="127.0.0.1", port=port)


if __name__ == "__main__":
    main()
