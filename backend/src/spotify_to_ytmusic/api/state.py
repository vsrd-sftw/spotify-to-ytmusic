"""In-memory state store with TTL for OAuth state parameters."""
import time


class StateStore:
    def __init__(self) -> None:
        self._store: dict[str, float] = {}

    def set(self, key: str, ttl_seconds: int = 600) -> None:
        self._store[key] = time.time() + ttl_seconds

    def get(self, key: str) -> str | None:
        expiry = self._store.get(key)
        if expiry is None:
            return None
        if time.time() > expiry:
            self._store.pop(key, None)
            return None
        return key

    def delete(self, key: str) -> None:
        self._store.pop(key, None)

    def cleanup(self) -> None:
        now = time.time()
        expired = [k for k, v in self._store.items() if now > v]
        for k in expired:
            self._store.pop(k, None)


state_store = StateStore()
