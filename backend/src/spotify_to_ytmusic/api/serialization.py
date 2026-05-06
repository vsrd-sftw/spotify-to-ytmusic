"""Serialize MigrationEvent dataclasses to camelCase dicts for WS transport."""
from dataclasses import asdict, fields

from spotify_to_ytmusic.core.events import (
    AlbumProcessed,
    AlbumSaveFailed,
    AlbumsDiscovered,
    MigrationEvent,
    MigrationFinished,
    PlaylistChunkFailed,
    PlaylistCreationFailed,
    PlaylistFinished,
    PlaylistStarted,
    PlaylistsDiscovered,
)


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def serialize_event(event: MigrationEvent) -> dict:
    cls = type(event).__name__
    data = asdict(event)
    return {"type": cls, **{_to_camel(k): v for k, v in data.items()}}
