"""Reports routes: list and detail."""
from fastapi import APIRouter, HTTPException, status

from spotify_to_ytmusic.api.models import (
    AlbumMigrationResultResponse,
    MissingItemResponse,
    PlaylistMigrationResultResponse,
    ReportDetailResponse,
    ReportSummaryResponse,
)
from spotify_to_ytmusic.core.report import list_reports, load_report

router = APIRouter(prefix="/api")


def _to_report_summary_response(report) -> ReportSummaryResponse:
    return ReportSummaryResponse(
        id=report.id or "",
        playlists=[
            PlaylistMigrationResultResponse(
                name=p.name,
                total=p.total,
                found=p.found,
                yt_playlist_id=p.yt_playlist_id,
                error=p.error,
            )
            for p in report.playlists
        ],
        albums=[
            AlbumMigrationResultResponse(
                label=a.label,
                status=a.status,
                error=a.error,
            )
            for a in report.albums
        ],
        not_found=[
            MissingItemResponse(context=n.context, item=n.item)
            for n in report.not_found
        ],
    )


@router.get("/reports", response_model=list[ReportSummaryResponse])
async def get_reports() -> list[ReportSummaryResponse]:
    reports = list_reports()
    return [_to_report_summary_response(r) for r in reports]


@router.get("/reports/{report_id}", response_model=ReportDetailResponse)
async def get_report(report_id: str) -> ReportDetailResponse:
    report = load_report(report_id)
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": f"Report '{report_id}' not found"},
        )
    return _to_report_summary_response(report)
