"""Tests for TrackCache: round-trip, atomic flush, edge cases."""
import json
from pathlib import Path

from spotify_to_ytmusic.core.track_cache import NOT_FOUND_SENTINEL, TrackCache


def _cache(tmp_path: Path) -> TrackCache:
    return TrackCache(tmp_path / "cache.json")


# --- Round-trip ------------------------------------------------------------


def test_cache_set_hit_and_get(tmp_path: Path):
    c = _cache(tmp_path)
    c.set_hit("spot_1", "vid_1")
    hit, value = c.get("spot_1")
    assert hit is True
    assert value == "vid_1"


def test_cache_miss_returns_none_value(tmp_path: Path):
    c = _cache(tmp_path)
    c.set_miss("spot_2")
    hit, value = c.get("spot_2")
    assert hit is True
    assert value is None


def test_cache_unknown_id_returns_miss(tmp_path: Path):
    c = _cache(tmp_path)
    hit, value = c.get("unknown")
    assert hit is False
    assert value is None


# --- Empty / invalid ids ---------------------------------------------------


def test_cache_ignores_empty_spotify_id(tmp_path: Path):
    c = _cache(tmp_path)
    c.set_hit("", "vid_1")
    c.set_miss("")
    hit, _ = c.get("")
    assert hit is False


def test_cache_ignores_empty_video_id(tmp_path: Path):
    c = _cache(tmp_path)
    c.set_hit("spot_1", "")
    hit, _ = c.get("spot_1")
    assert hit is False


# --- Atomic flush ----------------------------------------------------------


def test_flush_writes_and_no_tmp_left(tmp_path: Path):
    c = _cache(tmp_path)
    c.set_hit("s1", "v1")
    c.set_miss("s2")
    c.flush()

    path = tmp_path / "cache.json"
    assert path.exists()
    tmp_files = list(tmp_path.glob("*.tmp"))
    assert tmp_files == []

    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    assert data["s1"] == "v1"
    assert data["s2"] == NOT_FOUND_SENTINEL


def test_flush_creates_parent_dirs(tmp_path: Path):
    nested = tmp_path / "sub" / "dir"
    c = TrackCache(nested / "cache.json")
    c.set_hit("s1", "v1")
    c.flush()
    assert (nested / "cache.json").exists()


# --- Load from disk --------------------------------------------------------


def test_load_from_existing_file(tmp_path: Path):
    path = tmp_path / "cache.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"s1": "v1", "s2": NOT_FOUND_SENTINEL}, f)

    c = TrackCache(path)
    hit1, v1 = c.get("s1")
    hit2, v2 = c.get("s2")
    assert hit1 is True and v1 == "v1"
    assert hit2 is True and v2 is None


def test_load_ignores_non_string_values(tmp_path: Path):
    path = tmp_path / "cache.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"s1": "v1", "s2": 123, "s3": None}, f)

    c = TrackCache(path)
    assert len(c) == 1
    hit, _ = c.get("s1")
    assert hit is True


def test_load_handles_corrupt_file(tmp_path: Path):
    path = tmp_path / "cache.json"
    path.write_text("not json")

    c = TrackCache(path)
    assert len(c) == 0


def test_load_handles_wrong_shape(tmp_path: Path):
    path = tmp_path / "cache.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(["a", "b"], f)

    c = TrackCache(path)
    assert len(c) == 0
