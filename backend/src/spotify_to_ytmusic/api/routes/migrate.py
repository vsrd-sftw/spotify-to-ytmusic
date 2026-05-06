"""Migration routes: POST /migrate and WS /migrate/:jobId/events."""
import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status

from spotify_to_ytmusic.api.jobs import JobState, registry
from spotify_to_ytmusic.api.models import ErrorResponse, MigrateRequest, MigrateResponse
from spotify_to_ytmusic.api.serialization import serialize_event
from spotify_to_ytmusic.core.config import (
    BROWSER_AUTH_FILE,
    DEFAULT_SPOTIFY_REDIRECT_URI,
    SPOTIFY_TOKEN_CACHE_FILE,
    TRACK_CACHE_FILE,
)
from spotify_to_ytmusic.core.events import MigrationFinished
from spotify_to_ytmusic.core.migrator import Migrator
from spotify_to_ytmusic.core.report import save_report
from spotify_to_ytmusic.core.spotify_client import SpotifyClient
from spotify_to_ytmusic.core.track_cache import TrackCache
from spotify_to_ytmusic.core.ytmusic_client import YTMusicClient

router = APIRouter(prefix="/api")

_executor = ThreadPoolExecutor(max_workers=1)


def _run_migration(
    job_id: str,
    playlist_ids: list[str],
    album_ids: list[str],
) -> None:
    import os

    state = registry.get(job_id)
    if state is None:
        return

    spotify = SpotifyClient(
        client_id=os.getenv("SPOTIFY_CLIENT_ID", ""),
        client_secret=os.getenv("SPOTIFY_CLIENT_SECRET", ""),
        redirect_uri=os.getenv("SPOTIFY_REDIRECT_URI", DEFAULT_SPOTIFY_REDIRECT_URI),
        open_browser=False,
    )
    ytmusic = YTMusicClient(BROWSER_AUTH_FILE)
    cache = TrackCache(Path(TRACK_CACHE_FILE))

    def on_event(event) -> None:
        state.queue.put_nowait(event)

    migrator = Migrator(
        spotify=spotify,
        ytmusic=ytmusic,
        on_event=on_event,
        cache=cache,
    )

    if playlist_ids:
        migrator.migrate_playlists(playlist_ids)
    if album_ids:
        migrator.migrate_albums()

    report_path = save_report(migrator.report)
    report_id = report_path.stem.replace("migration_report_", "")
    state.queue.put_nowait(MigrationFinished(report_id=report_id))
    registry.mark_finished(job_id)


@router.post("/migrate", response_model=MigrateResponse, status_code=status.HTTP_201_CREATED)
async def start_migration(body: MigrateRequest) -> MigrateResponse | ErrorResponse:
    if registry.active_job_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": "A migration job is already running"},
        )

    job_id = uuid.uuid4().hex
    queue: asyncio.Queue = asyncio.Queue()
    registry.register(job_id, queue)

    loop = asyncio.get_running_loop()
    task = loop.run_in_executor(
        _executor,
        _run_migration,
        job_id,
        body.playlist_ids,
        body.album_ids,
    )
    registry.set_task(job_id, task)

    return MigrateResponse(job_id=job_id)


@router.websocket("/migrate/{job_id}/events")
async def migration_events(websocket: WebSocket, job_id: str) -> None:
    state = registry.get(job_id)
    if state is None:
        await websocket.close(code=4404)
        return

    await websocket.accept()

    try:
        while True:
            event = await state.queue.get()
            await websocket.send_json(serialize_event(event))
            if isinstance(event, MigrationFinished):
                await websocket.close()
                return
    except WebSocketDisconnect:
        return
