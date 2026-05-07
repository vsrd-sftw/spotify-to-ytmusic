"""Tests for atomic report writes and delete_report."""
import json
from pathlib import Path
from unittest.mock import patch

import pytest

from spotify_to_ytmusic.core.models import MigrationReport
from spotify_to_ytmusic.core.report import delete_report, save_report


def _empty_report() -> MigrationReport:
    return MigrationReport()


def test_save_report_writes_valid_json(tmp_path: Path):
    report = _empty_report()
    path = save_report(report, directory=tmp_path)

    assert path.exists()
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    assert "playlists" in data
    assert "albums" in data
    assert "not_found" in data


def test_save_report_no_residual_tmp(tmp_path: Path):
    report = _empty_report()
    save_report(report, directory=tmp_path)

    tmp_files = list(tmp_path.glob("*.tmp"))
    assert tmp_files == []


def test_save_report_interrupted_does_not_corrupt(tmp_path: Path):
    report = _empty_report()
    with patch("spotify_to_ytmusic.core.report.json.dump", side_effect=RuntimeError("boom")):
        with pytest.raises(RuntimeError, match="boom"):
            save_report(report, directory=tmp_path)

    json_files = list(tmp_path.glob("*.json"))
    assert json_files == []


def test_save_report_cleans_orphan_tmp(tmp_path: Path):
    orphan = tmp_path / "migration_report_20250101_000000.json.tmp"
    orphan.write_text("garbage")

    report = _empty_report()
    save_report(report, directory=tmp_path)

    assert not orphan.exists()


class TestDeleteReport:
    def test_delete_existing_report(self, tmp_path: Path):
        report_id = "20250101_000000"
        path = tmp_path / f"migration_report_{report_id}.json"
        path.write_text(json.dumps({"playlists": [], "albums": [], "not_found": []}))

        assert path.exists()
        result = delete_report(report_id, directory=tmp_path)

        assert result is True
        assert not path.exists()

    def test_delete_nonexistent_report(self, tmp_path: Path):
        result = delete_report("nonexistent", directory=tmp_path)
        assert result is False

    def test_delete_idempotent(self, tmp_path: Path):
        report_id = "20250101_000000"
        path = tmp_path / f"migration_report_{report_id}.json"
        path.write_text(json.dumps({"playlists": [], "albums": [], "not_found": []}))

        first = delete_report(report_id, directory=tmp_path)
        second = delete_report(report_id, directory=tmp_path)

        assert first is True
        assert second is False
