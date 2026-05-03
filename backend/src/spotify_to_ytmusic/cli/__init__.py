"""Command-line entry point. Translates Migrator events to console output."""
import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

from spotify_to_ytmusic.core.config import (
    BROWSER_AUTH_FILE,
    DEFAULT_SPOTIFY_REDIRECT_URI,
)
from spotify_to_ytmusic.core.events import (
    AlbumProcessed,
    AlbumsDiscovered,
    MigrationEvent,
    PlaylistFinished,
    PlaylistStarted,
    PlaylistsDiscovered,
)
from spotify_to_ytmusic.core.migrator import Migrator
from spotify_to_ytmusic.core.report import save_report
from spotify_to_ytmusic.core.spotify_client import SpotifyClient
from spotify_to_ytmusic.core.ytmusic_client import YTMusicClient


def _print_event(event: MigrationEvent) -> None:
    if isinstance(event, PlaylistsDiscovered):
        print(f"\n=== Migrating Playlists ===")
        print(f"Found {event.count} playlists\n")
    elif isinstance(event, PlaylistStarted):
        print(f"[playlist] {event.name} ({event.track_count} tracks)")
    elif isinstance(event, PlaylistFinished):
        line = f"  matched {event.found}/{event.total} tracks"
        if event.not_found_labels:
            preview = ", ".join(event.not_found_labels[:3])
            extra = len(event.not_found_labels) - 3
            suffix = f" ... (+{extra} more)" if extra > 0 else ""
            line += f" | not found: {preview}{suffix}"
        print(line)
    elif isinstance(event, AlbumsDiscovered):
        print(f"\n=== Migrating Saved Albums ===")
        print(f"Found {event.count} saved albums\n")
    elif isinstance(event, AlbumProcessed):
        print(f"[album] {event.label}\n  {event.status}")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Migrate Spotify library to YouTube Music"
    )
    parser.add_argument("--playlists", action="store_true", help="Migrate all playlists")
    parser.add_argument("--albums", action="store_true", help="Migrate saved albums")
    parser.add_argument("--all", dest="all_", action="store_true", help="Migrate everything")
    return parser.parse_args()


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        sys.exit(f"Error: {name} must be set in .env")
    return value


def main() -> None:
    load_dotenv()
    args = _parse_args()

    if not (args.playlists or args.albums or args.all_):
        print("Specify --playlists, --albums, or --all")
        sys.exit(0)

    client_id = _require_env("SPOTIFY_CLIENT_ID")
    client_secret = _require_env("SPOTIFY_CLIENT_SECRET")
    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI", DEFAULT_SPOTIFY_REDIRECT_URI)

    if not Path(BROWSER_AUTH_FILE).exists():
        sys.exit(
            f"Error: {BROWSER_AUTH_FILE} not found.\n"
            f"Run first:  python setup_ytmusic.py"
        )

    print("Connecting to Spotify...")
    spotify = SpotifyClient(client_id, client_secret, redirect_uri)

    print("Connecting to YouTube Music...")
    ytmusic = YTMusicClient()

    migrator = Migrator(spotify, ytmusic, on_event=_print_event)

    if args.all_ or args.playlists:
        migrator.migrate_playlists()
    if args.all_ or args.albums:
        migrator.migrate_albums()

    report_path = save_report(migrator.report)
    not_found_count = len(migrator.report.not_found)
    print(f"\nReport saved → {report_path}")
    if not_found_count:
        print(f"Items not found on YouTube Music: {not_found_count}")


if __name__ == "__main__":
    main()
