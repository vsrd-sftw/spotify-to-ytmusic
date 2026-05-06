"""Pydantic models for API responses with camelCase serialization."""
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class APIBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class HealthResponse(APIBase):
    ok: bool
    spotify: bool
    ytmusic: bool


class AuthUrlResponse(APIBase):
    url: str


class OkResponse(APIBase):
    ok: bool


class ErrorResponse(APIBase):
    message: str


class PlaylistSummaryResponse(APIBase):
    id: str
    name: str
    description: str
    track_count: int
    owner_id: str
    is_own: bool


class AlbumResponse(APIBase):
    name: str
    artist: str
    spotify_id: str


class PlaylistMigrationResultResponse(APIBase):
    name: str
    total: int
    found: int
    yt_playlist_id: str | None
    error: str | None = None


class AlbumMigrationResultResponse(APIBase):
    label: str
    status: str
    error: str | None = None


class MissingItemResponse(APIBase):
    context: str
    item: str


class ReportSummaryResponse(APIBase):
    id: str
    playlists: list[PlaylistMigrationResultResponse]
    albums: list[AlbumMigrationResultResponse]
    not_found: list[MissingItemResponse]


class ReportDetailResponse(APIBase):
    id: str
    playlists: list[PlaylistMigrationResultResponse]
    albums: list[AlbumMigrationResultResponse]
    not_found: list[MissingItemResponse]


class MigrateRequest(APIBase):
    playlist_ids: list[str]
    album_ids: list[str]


class MigrateResponse(APIBase):
    job_id: str
