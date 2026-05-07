# CLAUDE.md

Guidance for Claude Code working in this repo. Keep it short — long-form docs
live in `README.md` and `backend/README.md`.

## What this is

Desktop app + CLI that migrates a Spotify library (playlists + saved albums)
to YouTube Music. Monorepo:

- **`backend/`** — Python package with CLI, migration logic, and a FastAPI
  server (`api/`). Emits typed `MigrationEvent`s ready for HTTP/WS transport.
- **`frontend/`** — Vite/React 19 + TanStack Query + react-router-dom 7 + Tauri 2.
  Full UI (Connect, Library, Migrate, Reports). Talks to the backend via
  Vite proxy in dev mode, or via sidecar IPC in production Tauri builds.
  MSW mocks available for offline frontend development.
- **Desktop app** — Tauri 2 wraps the frontend + a PyInstaller-compiled sidecar
  binary. See [`PACKAGING.md`](PACKAGING.md).

## Where to run things

- Working directory for commands is the repo root unless noted.
- The CLI resolves `data/` relative to cwd. Run from `backend/` or set
  `SPOTIFY_TO_YTMUSIC_DATA_DIR`.
- Imports resolve via `PYTHONPATH=backend/src` for ad-hoc scripts.

## Common commands

```bash
# --- Backend ---
python backend/main.py --playlists   # interactive multi-select
python backend/main.py --all         # everything, no prompts
python backend/main.py --albums      # saved albums only

# Start API server (for frontend dev)
python -m spotify_to_ytmusic.api.server 8000

# Re-auth YT Music
cd backend && python setup_ytmusic.py

# Backend tests
cd backend && pytest

# --- Frontend ---
cd frontend && pnpm install
pnpm dev                 # Vite dev server on :5173
pnpm test:run            # Vitest
pnpm lint && pnpm build

# --- Desktop (Tauri) ---
cd frontend && pnpm tauri dev    # dev mode (needs backend on :8000)
pnpm tauri build                 # production bundle (needs sidecar + keypair)
```

## Architecture in one paragraph

`Migrator` ([core/migrator.py](backend/src/spotify_to_ytmusic/core/migrator.py))
is the orchestrator — emits typed events via an `on_event` callback. The CLI
([cli/__init__.py](backend/src/spotify_to_ytmusic/cli/__init__.py)) registers
`_print_event`; the API server ([routes/migrate.py](backend/src/spotify_to_ytmusic/api/routes/migrate.py))
pushes events into an asyncio queue for WebSocket streaming. **Don't `print()`
from core/** — emit a `MigrationEvent`.

`SpotifyClient` separates discovery (`list_playlist_summaries`, fast, no
tracks) from track loading (`load_playlist_by_id`, slow, lazy). `YTMusicClient`
wraps `ytmusicapi` with retry/backoff. `TrackCache` persists
`spotify_id → videoId | NOT_FOUND`.

## Non-obvious gotchas

- **Spotify API shape changed in 2025-2026.** Playlist items use `"item"`
  for the track object (the legacy `"track"` key is now a boolean). Playlist
  summaries use `items.total` for the track count.
- **`ytmusicapi.add_playlist_items` rejects duplicates.** Always pass
  `duplicates=True`.
- **YT Music throttles `add_playlist_items` by returning empty bodies**,
  surfacing as `JSONDecodeError`. Fixed with exponential backoff in
  `_add_chunk_with_retry`. Don't catch and silently ignore.
- **`YTMusicClient` distinguishes transient vs fatal errors.** Use
  `_classify_exception` — fatals propagate immediately, transients retry.
  `YTMusicAuthError` is construction-time only (in `_verify_auth`).
- **403s from `playlist_tracks` are normal** for collaborative/algorithmic
  playlists. `load_playlist_by_id` returns `None`; migrator skips them.
  Logs are silenced to CRITICAL in both CLI and API server.
- **Tracks with empty `spotify_id`** (rare local files) bypass the cache.
- **The frontend uses pnpm, not npm.** `pnpm-lock.yaml` is the source of truth.
- **MSW path patterns must be `*/api/...`, not `/api/...`.** Relative paths
  match in browser worker but not in Vitest's Node environment.
- **WebSocket reconnection only fires on abnormal closes.** Clean close codes
  (1000/1005) are considered final.
- **Selection lives in `SelectionContext`.** Don't introduce page-local
  `useState(new Set())` for picked items.
- **Routing is real (`react-router-dom` v7).** Use `<NavLink>` and `useNavigate`.
- **Per-page focus uses `useAutoFocusHeading`.** No global heading search.
- **`http.ts` enforces 15 s timeout** via `AbortSignal.timeout`. Go through
  `http`, not raw `fetch`.
- **Spotify credentials persist to `DATA_DIR/spotify_credentials.json`.**
  User sets them via the Connect page UI. `.env` takes precedence if present.
- **`SPOTIFY_REDIRECT_URI` in `.env` is CLI-only** (`:8888`). The API server
  always uses its own callback URL (`:5173` in dev, `:8000` in prod).
- **Dark mode is forced** (`class="dark"` on `<html>`). Primary color is purple
  (`primary-*` Tailwind palette). Don't introduce `blue-*` or light `gray-*`
  classes.
- **Migration page blocks navigation** while a job is running. Nav links are
  disabled and a confirmation dialog appears on exit attempts.

## Definition of Done

1. **All acceptance criteria met.**
2. **SOLID + clean code.** Small focused functions, meaningful names,
   no dead code, no premature abstraction.
3. **Tests exist and pass.** `pytest` from `backend/`, `pnpm test:run` from
   `frontend/`.
4. **Architectural fit:**
   - No `print()` from `core/` — emit `MigrationEvent`.
   - Reuse `SpotifyClient` / `YTMusicClient` / `TrackCache`.
   - Tunables in `config.py`.
   - Frontend: selection via `SelectionContext`, nav via react-router-dom,
     focus via `useAutoFocusHeading`, fetch via `lib/http.ts`.

## What lives where

```
backend/main.py                                   # CLI entry shim
backend/setup_ytmusic.py                          # YT Music browser auth setup
backend/src/spotify_to_ytmusic/
    cli/__init__.py                               # argparse + selector + event renderer
    core/
        config.py                                 # All tunables (rate limits, paths)
        models.py                                 # Dataclasses (Track, Playlist, Album)
        events.py                                 # MigrationEvent variants
        spotify_client.py                         # spotipy wrapper
        ytmusic_client.py                         # ytmusicapi wrapper + retry
        migrator.py                               # Orchestrator
        track_cache.py                            # Persistent search cache
        report.py                                 # JSON migration report
        text.py                                   # normalize() for fuzzy matching
        headers_parser.py                         # Browser headers → ytmusicapi
    api/                                          # FastAPI server
        __init__.py                               # create_app() + CORS
        server.py                                 # Dev entrypoint
        sidecar_server.py                         # Tauri sidecar entrypoint
        models.py, state.py, jobs.py, dependencies.py, serialization.py
        routes/{auth,health,library,migrate,reports}.py
backend/data/                                     # Runtime state, gitignored
backend/tests/                                    # pytest suite

frontend/
    src-tauri/                                    # Tauri 2 desktop app
        Cargo.toml, tauri.conf.json, capabilities/
        src/{main,lib}.rs
        binaries/                                 # Sidecar binaries (gitignored)
    src/
        main.tsx                                  # MSW + ErrorBoundary + BrowserRouter + QueryClient
        App.tsx                                   # <Routes> only
        contexts/                                 # SelectionContext
        components/{layout,ui,library,migrate}/
        pages/{Connect,Library,Migrate,Reports}/
        features/{auth,library,migrate,reports}/  # TanStack Query hooks
        hooks/                                    # useAutoFocusHeading, useFocusTrap,
                                                  # useMigrationEvents, useMigrationState
        lib/                                      # http, ws, tauri, query-client, download
        types/api.gen.ts                          # OpenAPI-generated types
        test/msw/                                 # Handlers, fixtures, server, browser
```
