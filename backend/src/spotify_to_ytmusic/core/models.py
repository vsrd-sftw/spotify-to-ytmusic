"""Domain models shared across modules."""
from dataclasses import dataclass, field


@dataclass
class Track:
    name: str
    artist: str
    album: str
    duration_ms: int
    spotify_id: str

    @property
    def label(self) -> str:
        return f"{self.artist} - {self.name}"


@dataclass
class Playlist:
    id: str
    name: str
    description: str
    tracks: list[Track] = field(default_factory=list)


@dataclass
class PlaylistSummary:
    id: str
    name: str
    description: str
    track_count: int
    owner_id: str
    is_own: bool


@dataclass
class Album:
    name: str
    artist: str
    spotify_id: str

    @property
    def label(self) -> str:
        return f"{self.artist} - {self.name}"


@dataclass
class PlaylistMigrationResult:
    name: str
    total: int
    found: int
    yt_playlist_id: str | None


@dataclass
class AlbumMigrationResult:
    label: str
    status: str  # "saved" | "found (not saved)"


@dataclass
class MissingItem:
    context: str
    item: str


@dataclass
class MigrationReport:
    playlists: list[PlaylistMigrationResult] = field(default_factory=list)
    albums: list[AlbumMigrationResult] = field(default_factory=list)
    not_found: list[MissingItem] = field(default_factory=list)
