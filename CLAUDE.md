# CLAUDE.md

Guidance for Claude Code working in this repo. Keep it short — long-form docs
live in `README.md` and `backend/README.md`.

## What this is

CLI that migrates a Spotify library (playlists + saved albums) to YouTube
Music. Monorepo: `backend/` is the Python package and CLI; `frontend/` is a
planned Vite/React UI that doesn't exist yet (only a README placeholder).
There is also an empty `backend/src/spotify_to_ytmusic/api/` reserved for a
future FastAPI server. **Don't bootstrap the frontend or the API server
unless asked** — the project is CLI-only today.

## Where to run things

- Working directory for commands is the repo root unless noted.
- The CLI resolves `data/` relative to the current working directory
  ([config.py](backend/src/spotify_to_ytmusic/core/config.py)). Run scripts
  from `backend/` or set `SPOTIFY_TO_YTMUSIC_DATA_DIR` so it finds
  `browser.json`, `.cache`, and `track_cache.json`.
- Editable install lives in the user site-packages, not a venv. Imports
  resolve via `PYTHONPATH=backend/src` for ad-hoc scripts.

## Common commands

```bash
# Run the migrator
python backend/main.py --playlists      # interactive multi-select
python backend/main.py --all            # everything, no prompts
python backend/main.py --albums         # saved albums only

# Re-auth YT Music (when browser.json expires)
cd backend && python setup_ytmusic.py
```

`pytest` and `ruff` are listed in `[project.optional-dependencies].dev`.
There is no CI yet, but new code is expected to ship with tests — see the
Definition of Done below.

## Architecture in one paragraph

`Migrator` ([core/migrator.py](backend/src/spotify_to_ytmusic/core/migrator.py))
is the orchestrator and emits typed events via an `on_event` callback. The CLI
([cli/__init__.py](backend/src/spotify_to_ytmusic/cli/__init__.py)) registers
`_print_event` as the callback to render progress. **Don't `print()` from
core/** — keep presentation in the CLI layer so a future WebSocket transport
can reuse the same events.

`SpotifyClient` separates discovery (`list_playlist_summaries`, fast, no
tracks) from track loading (`load_playlist_by_id`, slow, lazy). `YTMusicClient`
wraps `ytmusicapi` with retry/backoff. `TrackCache` persists
`spotify_id → videoId | NOT_FOUND` so retried migrations skip the slow YT
Music searches.

## Non-obvious gotchas

These will bite you if you don't know them. They're all the result of fixes
in git history, so check the relevant commit before "improving" any of this.

- **Spotify API shape changed in 2025-2026.** Playlist items use `"item"`
  for the track object (the legacy `"track"` key is now a boolean). Playlist
  summaries use `items.total` for the track count, not `tracks.total`. See
  [spotify_client.py](backend/src/spotify_to_ytmusic/core/spotify_client.py).
- **`ytmusicapi.add_playlist_items` rejects the entire chunk if any
  videoId is a duplicate.** Always pass `duplicates=True`. Spotify allows
  repeated tracks and YT search can collapse distinct tracks to the same
  videoId.
- **YT Music throttles `add_playlist_items` by returning empty bodies**,
  surfacing as `JSONDecodeError`. The fix is exponential backoff in
  [ytmusic_client.py `_add_chunk_with_retry`](backend/src/spotify_to_ytmusic/core/ytmusic_client.py).
  Don't catch and silently ignore — silent drops cost the user data.
- **403s from `playlist_tracks` are normal** for playlists the user doesn't
  fully own (e.g. some collaborative or algorithmic ones). `load_playlist_by_id`
  returns `None` in that case; the migrator just skips the playlist.
- **`spotipy.client` logs are silenced to CRITICAL** in
  [cli/__init__.py](backend/src/spotify_to_ytmusic/cli/__init__.py) to hide
  the 403 spam above. If you're debugging Spotify issues, raise that
  temporarily — but don't ship it raised, the spam is overwhelming.
- **Tracks with empty `spotify_id`** (rare local files) bypass the cache.
  Don't assume every Track has a usable id.

## Style and conventions

- Spanish in user-facing CLI strings (e.g. the questionary prompt) is
  intentional — match the existing tone, don't translate to English.
- Conventional Commits with scope: `feat(cli)`, `fix(ytmusic)`,
  `feat(cache)`, `feat(migrator)`, `docs`, `chore(config)`. Recent history
  is consistent; new commits should follow.
- Don't add comments that just restate what the code does. The existing
  comments mark non-obvious behavior (the gotchas above) — that's the bar.

## Definition of Done

A task is **only done** when **all** of the following hold. Read
[CONTRIBUTING.md](CONTRIBUTING.md) for the full version — this is the short
form so it's always in your context:

1. **All acceptance criteria met.** If the task came from an issue, every
   checkbox in the issue is satisfied. If from a verbal request, restate
   what "done" means and verify each point.
2. **SOLID + clean code.** Single responsibility per module/class, small
   focused functions, meaningful names, no dead code, no premature
   abstraction. When in doubt, prefer the simplest thing that works over
   a generic framework.
3. **Tests exist and pass.** New behavior has unit tests; bug fixes get a
   regression test that fails before the fix and passes after. Run
   `pytest` from `backend/` and confirm green before declaring done.
   Frontend tests (Vitest) when/where the frontend gets behavior worth
   testing.
4. **Architectural fit.** Respect the existing layering:
   - No `print()` from `core/` — emit a `MigrationEvent` and let the CLI
     layer render it.
   - Reuse `SpotifyClient` / `YTMusicClient` / `TrackCache` instead of
     calling `spotipy` / `ytmusicapi` directly from new code.
   - Tunables go in [config.py](backend/src/spotify_to_ytmusic/core/config.py),
     not hardcoded.
   - Don't bootstrap the FastAPI server (`api/`) or the frontend unless
     the task explicitly asks for it.

If any of these can't be met for a real reason, **say so explicitly in
the PR/handoff** rather than silently skipping. "No tests because X" is
acceptable; "done" without tests when tests were possible is not.

## What lives where

```
backend/main.py                                   # CLI entry shim
backend/setup_ytmusic.py                          # YT Music browser auth setup
backend/src/spotify_to_ytmusic/
    cli/__init__.py                               # argparse + selector + event renderer
    core/
        config.py                                 # All tunables (rate limits, paths)
        models.py                                 # Dataclasses (Track, Playlist, ...)
        events.py                                 # MigrationEvent variants
        spotify_client.py                         # spotipy wrapper
        ytmusic_client.py                         # ytmusicapi wrapper + retry
        migrator.py                               # Orchestrator
        track_cache.py                            # Persistent search cache
        report.py                                 # JSON migration report
        text.py                                   # normalize() for fuzzy matching
        headers_parser.py                         # Browser headers → ytmusicapi
backend/data/                                     # Runtime state, gitignored
```

## Plan files

There's a plan file at `.claude/plans/` from a previous session. Check it
for recent decisions before starting a new task — it may have context that
hasn't made it back to the READMEs yet.
