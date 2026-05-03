"""YouTube Music client wrapping ytmusicapi with retry/normalization logic."""
import time
from typing import Optional

from ytmusicapi import YTMusic

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
    pass


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
            except Exception:
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

    def create_playlist(
        self, name: str, description: str, video_ids: list[str]
    ) -> Optional[str]:
        try:
            playlist_id = self.yt.create_playlist(name, description)
        except Exception:
            return None
        for chunk in self._chunked(video_ids, YTMUSIC_PLAYLIST_CHUNK_SIZE):
            self._add_chunk_with_retry(playlist_id, chunk)
            time.sleep(YTMUSIC_PLAYLIST_CHUNK_DELAY_S)
        return playlist_id

    def _add_chunk_with_retry(self, playlist_id: str, chunk: list[str]) -> bool:
        # YT Music throttles add_playlist_items intermittently and the response
        # comes back empty, surfacing as a JSONDecodeError. The failure is
        # transient: a backoff retry recovers the same chunk.
        # duplicates=True is required because ytmusicapi rejects the whole
        # chunk on any duplicate videoId (Spotify allows repeats and YT search
        # can collapse distinct tracks to the same id).
        delay = YTMUSIC_ADD_ITEMS_BACKOFF_BASE_S
        for attempt in range(1, YTMUSIC_ADD_ITEMS_MAX_RETRIES + 1):
            try:
                response = self.yt.add_playlist_items(
                    playlist_id, chunk, duplicates=True
                )
            except Exception:
                response = None
            if isinstance(response, dict) and str(response.get("status", "")).startswith(
                "STATUS_SUCCEEDED"
            ):
                return True
            if attempt < YTMUSIC_ADD_ITEMS_MAX_RETRIES:
                time.sleep(delay)
                delay *= 2
        return False

    @staticmethod
    def _chunked(items: list, size: int):
        for i in range(0, len(items), size):
            yield items[i : i + size]

    def save_album(self, browse_id: str) -> bool:
        try:
            album = self.yt.get_album(browse_id)
            audio_playlist_id = album.get("audioPlaylistId")
            if not audio_playlist_id:
                return False
            self.yt.rate_playlist(audio_playlist_id, "LIKE")
            return True
        except Exception:
            return False
