"""YouTube Music client wrapping ytmusicapi with retry/normalization logic."""
import json
import time
from typing import Optional

import requests
from ytmusicapi import YTMusic
from ytmusicapi.exceptions import YTMusicServerError, YTMusicUserError

from spotify_to_ytmusic.core.config import (
    BROWSER_AUTH_FILE,
    YTMUSIC_ADD_ITEMS_BACKOFF_BASE_S,
    YTMUSIC_ADD_ITEMS_MAX_RETRIES,
    YTMUSIC_PLAYLIST_CHUNK_DELAY_S,
    YTMUSIC_PLAYLIST_CHUNK_SIZE,
    YTMUSIC_SEARCH_RESULT_LIMIT,
)
from spotify_to_ytmusic.core.text import normalize


class YTMusicAuthError(RuntimeError):
    """Raised on construction when the browser session is invalid/expired."""


class YTMusicTransientError(RuntimeError):
    """Network blips, throttling, or partial JSON responses. Retried with backoff."""


class YTMusicFatalError(RuntimeError):
    """Auth/quota/4xx persistent failures. Propagate so the Migrator decides what to skip."""


def _classify_exception(exc: BaseException) -> type:
    """Map a caught exception to the kind we treat it as.

    Anything we cannot positively identify as transient is fatal: silent
    retries on unknown errors burn quota and hide real bugs.
    """
    if isinstance(exc, json.JSONDecodeError):
        return YTMusicTransientError
    if isinstance(
        exc,
        (
            requests.exceptions.ConnectionError,
            requests.exceptions.Timeout,
            requests.exceptions.ChunkedEncodingError,
        ),
    ):
        return YTMusicTransientError
    if isinstance(exc, requests.exceptions.HTTPError):
        status = getattr(getattr(exc, "response", None), "status_code", None)
        if status is not None and status >= 500:
            return YTMusicTransientError
        return YTMusicFatalError
    if isinstance(exc, YTMusicServerError):
        return YTMusicTransientError
    if isinstance(exc, YTMusicUserError):
        return YTMusicFatalError
    return YTMusicFatalError


class YTMusicChunkError(YTMusicTransientError):
    """A chunk of tracks failed to be added after all retries. Carries chunk metadata."""

    def __init__(self, chunk_index: int, total_chunks: int, reason: str):
        self.chunk_index = chunk_index
        self.total_chunks = total_chunks
        self.reason = reason
        super().__init__(reason)


class YTMusicClient:
    def __init__(self, auth_file: str = BROWSER_AUTH_FILE):
        self.yt = YTMusic(auth_file)
        self._verify_auth()

    def _verify_auth(self) -> None:
        try:
            # filter="songs" avoids the buggy "top result" parser in ytmusicapi 1.12
            self.yt.search("test", filter="songs", limit=1)
        except Exception as e:
            raise YTMusicAuthError(
                f"YouTube Music session is invalid or expired ({type(e).__name__}). "
                "Run:  python setup_ytmusic.py"
            ) from e

    def search_song(self, title: str, artist: str) -> Optional[str]:
        return self._search_with_retries(
            queries=self._build_queries(artist, title),
            search_kwargs={"filter": "songs", "limit": 5},
            id_field="videoId",
            artist_to_match=artist,
        )

    def search_album(self, name: str, artist: str) -> Optional[dict]:
        result = self._search_with_retries(
            queries=self._build_queries(artist, name),
            search_kwargs={"filter": "albums", "limit": YTMUSIC_SEARCH_RESULT_LIMIT},
            id_field="browseId",
            artist_to_match=artist,
            return_full_result=True,
        )
        return result

    @staticmethod
    def _build_queries(artist: str, title: str) -> list[str]:
        candidates = [
            f"{artist} {title}",
            f"{title} {artist}",
            normalize(f"{artist} {title}"),
        ]
        seen: set[str] = set()
        unique = []
        for q in candidates:
            if q and q not in seen:
                seen.add(q)
                unique.append(q)
        return unique

    def _search_with_retries(
        self,
        queries: list[str],
        search_kwargs: dict,
        id_field: str,
        artist_to_match: str,
        return_full_result: bool = False,
    ):
        normalized_artist = normalize(artist_to_match)
        for query in queries:
            try:
                results = self.yt.search(query, **search_kwargs)
            except Exception as exc:
                if _classify_exception(exc) is YTMusicFatalError:
                    raise YTMusicFatalError(
                        f"Search failed for query {query!r}: "
                        f"{type(exc).__name__}: {exc}"
                    ) from exc
                # Transient: skip this query variant and try the next one.
                continue

            preferred = self._find_artist_match(results, id_field, normalized_artist)
            if preferred is not None:
                return preferred if return_full_result else preferred[id_field]

            fallback = self._find_first_with_id(results, id_field)
            if fallback is not None:
                return fallback if return_full_result else fallback[id_field]
        return None

    @staticmethod
    def _find_artist_match(
        results: list[dict], id_field: str, normalized_artist: str
    ) -> Optional[dict]:
        for result in results:
            if not result.get(id_field):
                continue
            result_artists = " ".join(
                a.get("name", "") for a in result.get("artists", [])
            )
            if normalized_artist in normalize(result_artists):
                return result
        return None

    @staticmethod
    def _find_first_with_id(results: list[dict], id_field: str) -> Optional[dict]:
        return next((r for r in results if r.get(id_field)), None)

    def create_playlist(self, name: str, description: str) -> str:
        try:
            playlist_id = self.yt.create_playlist(name, description)
        except Exception as exc:
            raise YTMusicFatalError(
                f"Failed to create playlist {name!r}: "
                f"{type(exc).__name__}: {exc}"
            ) from exc
        if not playlist_id or not isinstance(playlist_id, str):
            raise YTMusicFatalError(
                f"create_playlist returned invalid id for {name!r}: "
                f"{playlist_id!r}"
            )
        return playlist_id

    def add_tracks_to_playlist(self, playlist_id: str, video_ids: list[str]) -> None:
        chunks = list(self._chunked(video_ids, YTMUSIC_PLAYLIST_CHUNK_SIZE))
        for i, chunk in enumerate(chunks):
            try:
                self._add_chunk_with_retry(playlist_id, chunk)
            except YTMusicTransientError as exc:
                raise YTMusicChunkError(
                    chunk_index=i,
                    total_chunks=len(chunks),
                    reason=str(exc),
                ) from exc
            time.sleep(YTMUSIC_PLAYLIST_CHUNK_DELAY_S)

    def _add_chunk_with_retry(self, playlist_id: str, chunk: list[str]) -> None:
        # YT Music throttles add_playlist_items intermittently and the response
        # comes back empty, surfacing as a JSONDecodeError. The failure is
        # transient: a backoff retry recovers the same chunk.
        # duplicates=True is required because ytmusicapi rejects the whole
        # chunk on any duplicate videoId (Spotify allows repeats and YT search
        # can collapse distinct tracks to the same id).
        delay = YTMUSIC_ADD_ITEMS_BACKOFF_BASE_S
        last_response: object = None
        last_exc: Exception | None = None
        for attempt in range(1, YTMUSIC_ADD_ITEMS_MAX_RETRIES + 1):
            try:
                response = self.yt.add_playlist_items(
                    playlist_id, chunk, duplicates=True
                )
            except Exception as exc:
                if _classify_exception(exc) is YTMusicFatalError:
                    raise YTMusicFatalError(
                        f"Failed to add chunk to playlist {playlist_id}: "
                        f"{type(exc).__name__}: {exc}"
                    ) from exc
                last_exc = exc
                response = None
            last_response = response
            if isinstance(response, dict) and str(
                response.get("status", "")
            ).startswith("STATUS_SUCCEEDED"):
                return
            if attempt < YTMUSIC_ADD_ITEMS_MAX_RETRIES:
                time.sleep(delay)
                delay *= 2
        raise YTMusicTransientError(
            f"add_playlist_items exhausted retries for playlist {playlist_id} "
            f"(last response: {last_response!r}, last exc: {last_exc!r})"
        )

    @staticmethod
    def _chunked(items: list, size: int):
        for i in range(0, len(items), size):
            yield items[i : i + size]

    def save_album(self, browse_id: str) -> bool:
        delay = YTMUSIC_ADD_ITEMS_BACKOFF_BASE_S
        last_exc: Exception | None = None
        for attempt in range(1, YTMUSIC_ADD_ITEMS_MAX_RETRIES + 1):
            try:
                album = self.yt.get_album(browse_id)
                audio_playlist_id = album.get("audioPlaylistId")
                if not audio_playlist_id:
                    return False
                self.yt.rate_playlist(audio_playlist_id, "LIKE")
                return True
            except Exception as exc:
                if _classify_exception(exc) is YTMusicFatalError:
                    raise YTMusicFatalError(
                        f"Failed to save album {browse_id}: "
                        f"{type(exc).__name__}: {exc}"
                    ) from exc
                last_exc = exc
                if attempt < YTMUSIC_ADD_ITEMS_MAX_RETRIES:
                    time.sleep(delay)
                    delay *= 2
        raise YTMusicTransientError(
            f"save_album exhausted retries for {browse_id} (last exc: {last_exc!r})"
        )
