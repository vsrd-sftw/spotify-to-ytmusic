"""In-memory state store with TTL for OAuth state parameters."""
import time


class StateStore:
    def __init__(self) -> None:
        self._store: dict[str, dict] = {}

    def set(self, key: str, ttl_seconds: int = 300, **data: str) -> None:
        entry: dict = {"_expiry": time.time() + ttl_seconds}
        entry.update(data)
        self._store[key] = entry

    def get(self, key: str) -> dict | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        if time.time() > entry["_expiry"]:
            self._store.pop(key, None)
            return None
        return entry

    def delete(self, key: str) -> None:
        self._store.pop(key, None)

    def cleanup(self) -> None:
        now = time.time()
        expired = [k for k, v in self._store.items() if now > v["_expiry"]]
        for k in expired:
            self._store.pop(k, None)


state_store = StateStore()
