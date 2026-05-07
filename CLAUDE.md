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
  Vite proxy in dev mode, or via Tauri IPC (`invoke('proxy_request')`) in
  production desktop builds. MSW mocks available for offline frontend dev.
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

### Spotify / YT Music APIs
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

### Frontend conventions
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
- **Dark mode is forced** (`class="dark"` on `<html>`). Primary color is purple
  (`primary-*` Tailwind palette). Don't introduce `blue-*` or light `gray-*`
  classes.
- **Migration page blocks navigation** while a job is running. Nav links are
  disabled and a confirmation dialog appears on exit attempts.

### Desktop app (Tauri + sidecar)
- **HTTP goes through IPC, not `fetch`.** In Tauri production mode,
  `lib/http.ts` routes all HTTP calls through `invoke('proxy_request')` →
  Rust `ureq` → sidecar. The WebView2 browser blocks `fetch` from
  `tauri://localhost` to `http://127.0.0.1` (CORS/security). The IPC proxy
  bypasses this entirely. Never use raw `fetch` in desktop-mode features.
- **Tauri sync commands run on the MAIN THREAD.** `proxy_request` is a
  `#[tauri::command] fn` (sync) → `ureq` blocks the main thread for up to
  30 s. During HTTP calls the entire webview is frozen. Future fix: make it
  `async fn` with `spawn_blocking`. Until then, keep sidecar requests fast.
- **Sidecar port is fixed at 53000** (outside Windows ephemeral range
  49152-65535). Using a port inside that range causes `WinError 10013`
  (WSAEACCES). The OAuth redirect URI must match: register
  `http://127.0.0.1:53000/api/auth/spotify/callback` in the Spotify dashboard.
- **`SPOTIFY_TO_YTMUSIC_DATA_DIR` is set by the Tauri host** to
  `app_data_dir()` (e.g. `%APPDATA%\com.spotify-to-ytmusic.app`). The
  sidecar reads this env var in `config.py`. Without it, the sidecar
  defaults to `./data` relative to its CWD (somewhere in Program Files,
  unwritable). Credentials, cache, and reports are stored here.
- **Sidecar cleanup on exit.** The `child` process handle is stored in
  `SidecarState` and killed via `RunEvent::Exit` in `.run()` callback.
  Don't spawn the child without storing a reference to kill it.
- **`build_sidecar.py` copies a ONE-FILE binary.** The PyInstaller spec
  (`--onefile`) produces `dist/spotify-to-ytmusic-server.exe` directly (no
  subdirectory). The script copies it to `binaries/spotify-to-ytmusic-server-{target-triple}.exe`.
- **PyInstaller excludes must NOT remove `email`, `html`, `http.server`,
  `xmlrpc`.** `spotipy` → `redis` → `importlib.metadata` needs `email`;
  `spotipy.oauth2` needs `html`. Excluding these causes
  `ModuleNotFoundError` at sidecar startup.
- **Tauri custom-protocol is DISABLED** (`default = []` in Cargo.toml).
  Without it the webview uses `http://127.0.0.1:{port}` as origin, which
  would allow `fetch` to localhost (but we proxy through IPC anyway).
- **Release workflow is Windows-only.** `release.yml` only builds
  `windows-latest`. Tag `v*` to trigger.
- **Updater plugin** requires `TAURI_SIGNING_PRIVATE_KEY` and
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets configured in the repo.
  The pubkey lives in `tauri.conf.json` under `plugins.updater.pubkey`.
- **Spotify OAuth callback** returns an HTML page (not a redirect) because
  the Tauri frontend port is unknown at callback time. The user must
  manually return to the app. Future: use `shell.open()` to open Spotify
  in the system browser instead of navigating the webview away.
- **YT Music auth (`POST /api/auth/ytmusic`)** calls
  `ytmusicapi.setup_browser()` which may block or hang. Avoid calling it
  from a sync Tauri command without a timeout guard.
- **Credenciales Spotify**: se guardan via UI en `spotify_credentials.json`.
  El `.env` solo sirve para la CLI.

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
