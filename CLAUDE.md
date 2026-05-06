# CLAUDE.md

Guidance for Claude Code working in this repo. Keep it short — long-form docs
live in `README.md` and `backend/README.md`.

## What this is

CLI that migrates a Spotify library (playlists + saved albums) to YouTube
Music. Monorepo:

- **`backend/`** — Python package and CLI. Production-ready for the CLI
  flow; emits typed `MigrationEvent`s ready for an HTTP/WS transport.
- **`frontend/`** — Vite/React 19 + TanStack Query + react-router-dom 7.
  Full UI built page by page (Connect, Library, Migrate, Reports). Talks
  to the backend through a `*/api/...` contract that **only MSW serves
  today** — there is no live HTTP backend yet.
- **`backend/src/spotify_to_ytmusic/api/`** — empty placeholder reserved
  for the FastAPI server (issues #67–#70 will fill it in).

**The integration gap is the next big piece of work.** Until then:

- CLI is the only end-to-end working flow (`python backend/main.py …`).
- Frontend "works" against MSW mocks: it renders, navigates, validates
  forms, exercises hooks/tests — but Connect doesn't actually OAuth,
  Migrate doesn't actually run a job, and Reports list/detail are
  fixtures, not files on disk.
- **Don't bootstrap the FastAPI server (`api/`) unless the task explicitly
  asks for it.** Same for new top-level frontend features.

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
- **`YTMusicClient` distinguishes transient from fatal errors.** Public
  methods can raise `YTMusicTransientError` (network/throttle, retries
  already exhausted) or `YTMusicFatalError` (auth, 4xx, anything not
  classified as transient). Never write `except Exception: return None`
  in this module — use `_classify_exception` so fatals propagate
  immediately instead of burning the retry budget. The `Migrator`
  catches `YTMusicFatalError` per playlist/album and records the reason
  in `MigrationReport.error` so the user sees why the item failed.
  `YTMusicAuthError` is reserved for the construction-time check in
  `_verify_auth`.
- **403s from `playlist_tracks` are normal** for playlists the user doesn't
  fully own (e.g. some collaborative or algorithmic ones). `load_playlist_by_id`
  returns `None` in that case; the migrator just skips the playlist.
- **`spotipy.client` logs are silenced to CRITICAL** in
  [cli/__init__.py](backend/src/spotify_to_ytmusic/cli/__init__.py) to hide
  the 403 spam above. If you're debugging Spotify issues, raise that
  temporarily — but don't ship it raised, the spam is overwhelming.
- **Tracks with empty `spotify_id`** (rare local files) bypass the cache.
  Don't assume every Track has a usable id.
- **The frontend uses pnpm, not npm.** `pnpm-lock.yaml` is the source of
  truth. npm 11.12.1 crashes with `Cannot read properties of null (reading
  'matches')` (arborist bug) when installing some deps like `msw`. Use
  `pnpm add` / `pnpm install` from `frontend/`.
- **MSW path patterns must be `*/api/...`, not `/api/...`.** Relative paths
  match in the browser worker but not in Vitest's Node environment, so
  handler tests silently fall through to `onUnhandledRequest: 'error'`. See
  [handlers.ts](frontend/src/test/msw/handlers.ts).
- **WebSocket reconnection only fires on abnormal closes.** `WsConnection.onclose`
  short-circuits to `closed` (no reconnect) when `ev.wasClean`, `ev.code === 1000`
  or `ev.code === 1005`. The MSW handler closes the WS cleanly after streaming
  the fixture batch — without this guard the migrate page enters an infinite
  reopen loop. See [ws.ts](frontend/src/lib/ws.ts) and the regression test
  `does not reconnect when the server closes the stream cleanly` in
  [useMigrationEvents.test.tsx](frontend/src/hooks/useMigrationEvents.test.tsx).
- **Selection lives in `SelectionContext`, not in page-local state.** Each
  page used to call `useSelection` independently, which silently reset the
  user's choices when navigating Library → Migrate. Read/write through
  [`useSelectionContext`](frontend/src/contexts/useSelectionContext.ts);
  don't introduce new local `useState(new Set())` for picked playlists/albums.
- **Routing is real (`react-router-dom` v7).** Use `<Link>`/`<NavLink>` and
  `useNavigate` — don't reintroduce a `section` enum or imperative
  `setSection` calls. Deep links like `/reports/:id` must keep working on
  refresh.
- **Per-page focus management uses `useAutoFocusHeading`.** The old global
  `useEffect` in `App.tsx` that searched for any `h2/h3` was removed.
  Each page declares its own heading `ref` and calls the hook on mount.
  Don't reintroduce a cross-page focus side-effect.
- **`http.ts` enforces a 15 s default timeout** via `AbortSignal.timeout`.
  Override per call with `http.get(path, { timeoutMs })`. A timed-out
  request rejects with a `DOMException` whose `name` is `TimeoutError`
  (or `AbortError` if the caller aborted). Don't wrap `fetch` directly
  from feature code — go through `http`.

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

frontend/                                         # Vite + React 19 + TanStack Query + react-router-dom 7
    public/mockServiceWorker.js                   # MSW worker (generated, committed)
    src/
        main.tsx                                  # MSW + ErrorBoundary + BrowserRouter + QueryClient
        App.tsx                                   # <Routes> only — no section enum
        types/api.ts                              # TS mirror of backend models + events
        contexts/                                 # SelectionContext (cross-page selection)
        components/
            layout/                               # AppShell, Header, Footer, ErrorBoundary, ConnectionStatus
            ui/                                   # Button, Toast, Card, Input, Skeleton, …
            library/                              # Tabs, SelectionSummary
            migrate/                              # PlaylistProgress, AlbumProgress, NotFound, …
        pages/                                    # Connect, Library, Migrate, Reports/{List,Detail}
        features/                                 # auth/, library/, migrate/, reports/ — TanStack hooks
        hooks/                                    # useAutoFocusHeading, useFocusTrap, useMigrationEvents
        lib/                                      # http (timeout-aware), ws (clean-close aware), query-client, download
        test/setup.ts                             # Vitest + MSW server lifecycle
        test/msw/                                 # handlers, fixtures, server, browser
backend/tests/                                    # pytest suite (migrator, ytmusic_client) — incomplete; see #66
```

## Plan files

There's a plan file at `.claude/plans/` from a previous session. Check it
for recent decisions before starting a new task — it may have context that
hasn't made it back to the READMEs yet.

## Roadmap state

The backlog after the May 2026 audit is grouped into four blocks (issues
#58–#74). State as of the last update:

- **Frontend hardening (#58–#62):** all merged. Selection persists across
  pages, react-router-dom drives navigation, per-page focus management,
  WS reducer + rAF-coalesced scroll, lowercase folders, ErrorBoundary
  global, `http` with timeout.
- **Backend correctness (#63):** merged. Typed YT Music exceptions.
- **Backend correctness (#64–#66):** open. Failure events, atomic
  report writes, full pytest suite.
- **Integration / FastAPI (#67–#71):** open. Bootstrap, auth, read-only
  routes, migrate POST + WS, OpenAPI-generated TS types + Vite proxy.
  **This is the unlock for the frontend's mock-only state.**
- **Desktop / Tauri (#72–#74):** open. PyInstaller sidecar, Tauri scaffold,
  OAuth + auto-updater.

The critical path to a real (non-mock) end-to-end app is **#67 → #68 →
#69 → #70 → #71**. Until #71 lands, the frontend talks to MSW: Connect
buttons, Migrate jobs, and Reports come from fixtures, not the backend.
