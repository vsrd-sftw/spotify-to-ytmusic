"""Persists MigrationReport instances to disk as JSON."""
import json
import os
import re
from dataclasses import asdict
from datetime import datetime
from pathlib import Path

from spotify_to_ytmusic.core.config import DATA_DIR
from spotify_to_ytmusic.core.models import (
    AlbumMigrationResult,
    MigrationReport,
    MissingItem,
    PlaylistMigrationResult,
)

_REPORT_RE = re.compile(r"^migration_report_(\d{8}_\d{6})\.json$")


def save_report(report: MigrationReport, directory: Path | str | None = None) -> Path:
    target_dir = Path(directory) if directory is not None else DATA_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = target_dir / f"migration_report_{timestamp}.json"

    for orphan in target_dir.glob("migration_report_*.tmp"):
        orphan.unlink(missing_ok=True)

    payload = {
        "playlists": [asdict(p) for p in report.playlists],
        "albums": [asdict(a) for a in report.albums],
        "not_found": [asdict(n) for n in report.not_found],
    }
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    os.replace(tmp, path)
    return path


def list_reports(directory: Path | str | None = None) -> list[MigrationReport]:
    target_dir = Path(directory) if directory is not None else DATA_DIR
    if not target_dir.exists():
        return []

    reports: list[MigrationReport] = []
    for entry in sorted(target_dir.glob("migration_report_*.json"), reverse=True):
        match = _REPORT_RE.match(entry.name)
        if not match:
            continue
        try:
            with open(entry, encoding="utf-8") as f:
                data = json.load(f)
            reports.append(_parse_report(data, match.group(1)))
        except (json.JSONDecodeError, KeyError):
            continue
    return reports


def load_report(report_id: str, directory: Path | str | None = None) -> MigrationReport | None:
    target_dir = Path(directory) if directory is not None else DATA_DIR
    path = target_dir / f"migration_report_{report_id}.json"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return _parse_report(data, report_id)


def delete_report(report_id: str, directory: Path | str | None = None) -> bool:
    target_dir = Path(directory) if directory is not None else DATA_DIR
    path = target_dir / f"migration_report_{report_id}.json"
    if not path.exists():
        return False
    path.unlink()
    return True


def _parse_report(data: dict, report_id: str) -> MigrationReport:
    return MigrationReport(
        id=report_id,
        playlists=[
            PlaylistMigrationResult(
                name=p["name"],
                total=p["total"],
                found=p["found"],
                yt_playlist_id=p.get("yt_playlist_id"),
                error=p.get("error"),
            )
            for p in data.get("playlists", [])
        ],
        albums=[
            AlbumMigrationResult(
                label=a["label"],
                status=a["status"],
                error=a.get("error"),
            )
            for a in data.get("albums", [])
        ],
        not_found=[
            MissingItem(context=n["context"], item=n["item"])
            for n in data.get("not_found", [])
        ],
    )
