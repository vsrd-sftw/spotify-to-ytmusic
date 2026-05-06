"""Job registry for tracking active and completed migration jobs."""
import asyncio
import time
from dataclasses import dataclass, field
from typing import Any

JOB_TTL_SECONDS = 600


@dataclass
class JobState:
    queue: "asyncio.Queue[Any]"
    task: asyncio.Task | None = None
    finished_at: float | None = None


class JobRegistry:
    def __init__(self, ttl_seconds: int = JOB_TTL_SECONDS) -> None:
        self._jobs: dict[str, JobState] = {}
        self._ttl = ttl_seconds

    @property
    def active_job_id(self) -> str | None:
        for job_id, state in self._jobs.items():
            if state.finished_at is None:
                return job_id
        return None

    def register(self, job_id: str, queue: "asyncio.Queue[Any]") -> None:
        self._jobs[job_id] = JobState(queue=queue)

    def get(self, job_id: str) -> JobState | None:
        self._cleanup_expired()
        return self._jobs.get(job_id)

    def mark_finished(self, job_id: str) -> None:
        state = self._jobs.get(job_id)
        if state:
            state.finished_at = time.time()

    def set_task(self, job_id: str, task: asyncio.Task) -> None:
        state = self._jobs.get(job_id)
        if state:
            state.task = task

    def remove(self, job_id: str) -> None:
        self._jobs.pop(job_id, None)

    def _cleanup_expired(self) -> None:
        now = time.time()
        expired = [
            jid
            for jid, state in self._jobs.items()
            if state.finished_at is not None and now - state.finished_at > self._ttl
        ]
        for jid in expired:
            self._jobs.pop(jid, None)


registry = JobRegistry()
