"""Event types emitted by the Migrator. Decouples logic from presentation."""
from dataclasses import dataclass
from typing import Callable, Union


@dataclass
class PlaylistsDiscovered:
    count: int


@dataclass
class PlaylistStarted:
    name: str
    track_count: int


@dataclass
class PlaylistFinished:
    name: str
    found: int
    total: int
    not_found_labels: list[str]


@dataclass
class AlbumsDiscovered:
    count: int


@dataclass
class AlbumProcessed:
    label: str
    status: str  # "saved" | "found (not saved)" | "not found"


MigrationEvent = Union[
    PlaylistsDiscovered,
    PlaylistStarted,
    PlaylistFinished,
    AlbumsDiscovered,
    AlbumProcessed,
]

EventCallback = Callable[[MigrationEvent], None]
