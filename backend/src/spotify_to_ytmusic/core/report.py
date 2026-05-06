"""Persists MigrationReport instances to disk as JSON."""
import json
import os
from dataclasses import asdict
from datetime import datetime
from pathlib import Path

from spotify_to_ytmusic.core.config import DATA_DIR
from spotify_to_ytmusic.core.models import MigrationReport


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
