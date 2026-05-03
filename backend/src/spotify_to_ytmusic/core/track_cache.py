"""Persistent cache mapping Spotify track ids to YT Music videoIds (or misses)."""
import json
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

NOT_FOUND_SENTINEL = "__NOT_FOUND__"


class TrackCache:
    def __init__(self, path: Path):
        self.path = path
        self._data: dict[str, str] = self._load()

    def _load(self) -> dict[str, str]:
        if not self.path.exists():
            return {}
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("Track cache at %s unreadable (%s); starting empty", self.path, e)
            return {}
        if not isinstance(data, dict):
            logger.warning("Track cache at %s has unexpected shape; starting empty", self.path)
            return {}
        return {str(k): str(v) for k, v in data.items() if isinstance(v, str)}

    def get(self, spotify_id: str) -> tuple[bool, str | None]:
        """Returns (hit, value). value is None for cached misses, str for hits."""
        if not spotify_id:
            return (False, None)
        if spotify_id not in self._data:
            return (False, None)
        stored = self._data[spotify_id]
        if stored == NOT_FOUND_SENTINEL:
            return (True, None)
        return (True, stored)

    def set_hit(self, spotify_id: str, video_id: str) -> None:
        if not spotify_id or not video_id:
            return
        self._data[spotify_id] = video_id

    def set_miss(self, spotify_id: str) -> None:
        if not spotify_id:
            return
        self._data[spotify_id] = NOT_FOUND_SENTINEL

    def flush(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self._data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, self.path)

    def __len__(self) -> int:
        return len(self._data)
