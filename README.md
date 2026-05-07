# spotify-to-ytmusic

Migrate your Spotify library to YouTube Music — playlists and saved albums included.

This is a monorepo:

- **Backend:** `backend/` is a Python package with the migration logic, CLI,
  and a FastAPI server (`api/`).
- **Frontend:** `frontend/` is a Vite + React 19 + TypeScript + TanStack
  Query + react-router-dom 7 app. Runs against MSW mocks in dev mode;
  talks to the FastAPI server through a Vite proxy when it's running.
- **Desktop app:** a [Tauri 2](https://tauri.app) wrapper that bundles the
  frontend and the FastAPI backend (as a PyInstaller sidecar) into a
  single native app. See [`PACKAGING.md`](PACKAGING.md).

## Status

- **CLI:** full Spotify → YouTube Music migration end-to-end with JSON
  reports (`python backend/main.py …`).
- **API + web UI:** the FastAPI server (`python -m spotify_to_ytmusic.api.server`)
  and the React frontend (`pnpm dev`) are fully functional. Connect your
  Spotify account, browse your library, select what to migrate, run a
  migration with live WebSocket progress, and browse or delete reports.
- **Desktop app:** the Tauri 2 wrapper is fully functional. Run
  `cd frontend && pnpm tauri dev` for development mode (requires the
  FastAPI server on :8000), or build a standalone installer with
  `pnpm tauri build`. See [PACKAGING.md](PACKAGING.md) for the full
  production build pipeline.

## Features

- Interactive selector to pick which playlists to migrate (one, several, or all)
- Migrates Spotify playlists (including private and collaborative ones)
- Migrates your saved albums as liked albums on YouTube Music
- Track and album matching with artist-name validation and fuzzy fallbacks
- Persistent search cache — retrying a failed migration doesn't repeat
  the slow YouTube Music searches
- JSON report with statistics and a list of items not found
- Event-driven `Migrator` ready to drive a UI over WebSockets
- Typed exception layer (`YTMusicTransientError` vs `YTMusicFatalError`)
  so transient throttling retries silently while fatal failures (auth,
  permanent 4xx) propagate and are recorded in the report

## Quick start

```bash
git clone https://github.com/vsrd-sftw/spotify-to-ytmusic.git
cd spotify-to-ytmusic/backend

# Install the package (editable install picks up local changes)
pip install -e .

# Configure credentials
cp .env.example .env
# edit .env with your Spotify Client ID/Secret

# Authenticate against YouTube Music (writes data/browser.json)
python setup_ytmusic.py

# Migrate everything (no prompts)
python main.py --all

# Or pick which playlists to migrate from an interactive list
python main.py --playlists
```

For full backend setup (Spotify Developer app, OAuth steps, browser headers
guide, report format), see [`backend/README.md`](backend/README.md).

For frontend plans and the backend API contract, see
[`frontend/README.md`](frontend/README.md).

## Repository layout

```
spotify-to-ytmusic/
├── README.md                       # You are here
├── CONTRIBUTING.md                 # Contributor guidelines (DoD, process, style)
├── PACKAGING.md                    # Sidecar and Tauri build instructions
├── CLAUDE.md                       # Agent context (gotchas, conventions)
├── .gitignore
├── docs/
│   └── oauth-desktop.md            # Desktop OAuth strategy decisions
├── backend/
│   ├── pyproject.toml              # Installable package definition
│   ├── requirements.txt            # Pinned runtime deps
│   ├── spotify-to-ytmusic-server.spec  # PyInstaller spec for the sidecar
│   ├── .env / .env.example         # Spotify credentials
│   ├── main.py                     # CLI entry point
│   ├── setup_ytmusic.py            # YouTube Music browser auth setup
│   ├── scripts/
│   │   └── build_sidecar.py        # PyInstaller build script
│   ├── data/                       # Runtime state (gitignored)
│   │   ├── browser.json
│   │   ├── .cache                  # Spotify OAuth token cache
│   │   ├── track_cache.json        # YT Music search cache (persistent)
│   │   └── migration_report_*.json
│   └── src/
│       └── spotify_to_ytmusic/
│           ├── __init__.py
│           ├── core/               # Domain logic (no I/O presentation)
│           │   ├── config.py       # Tunable constants and paths
│           │   ├── models.py       # Track, Album, Playlist, MigrationReport
│           │   ├── events.py       # Typed Migrator events
│           │   ├── text.py         # Shared string normalization
│           │   ├── headers_parser.py
│           │   ├── spotify_client.py
│           │   ├── ytmusic_client.py
│           │   ├── track_cache.py  # Persistent YT Music search cache
│           │   ├── migrator.py     # Event-driven orchestrator
│           │   └── report.py       # JSON report serialization
│           ├── cli/                # Console entry point
│           │   └── __init__.py
│           └── api/                # FastAPI server
│               ├── __init__.py     # create_app() factory + CORS
│               ├── server.py       # Dev entrypoint (uvicorn on :8000)
│               ├── sidecar_server.py  # Tauri sidecar entrypoint
│               ├── models.py       # Pydantic response models (camelCase)
│               ├── state.py        # In-memory OAuth state (TTL-based)
│               ├── jobs.py         # In-memory migration job manager
│               ├── dependencies.py # FastAPI dependencies
│               ├── serialization.py
│               └── routes/         # /auth, /health, /library, /migrate, /reports
├── frontend/
│   ├── package.json                # pnpm workspace + Tauri deps
│   ├── vite.config.ts
│   ├── public/mockServiceWorker.js # MSW worker (committed)
│   ├── src-tauri/                  # Tauri 2 desktop app
│   │   ├── Cargo.toml
│   │   ├── tauri.conf.json
│   │   ├── capabilities/default.json
│   │   ├── binaries/               # Sidecar binaries (built, gitignored)
│   │   └── src/
│   │       ├── main.rs             # Tauri entry point
│   │       └── lib.rs              # Sidecar spawning + commands
│   └── src/
│       ├── main.tsx                # MSW + ErrorBoundary + BrowserRouter
│       ├── App.tsx                 # <Routes> for /connect /library /migrate /reports
│       ├── pages/                  # One folder per top-level route
│       ├── components/{layout,ui,library,migrate}/
│       ├── features/{auth,library,migrate,reports}/   # TanStack Query hooks
│       ├── contexts/SelectionContext.tsx              # Cross-page selection
│       ├── hooks/                  # useAutoFocusHeading, useFocusTrap, useMigrationEvents
│       ├── lib/                    # http (timeout-aware), ws, tauri, query-client
│       ├── types/api.gen.ts        # Generated from OpenAPI (pnpm gen:api)
│       └── test/msw/               # Handlers, fixtures, server, browser worker
├── .github/workflows/
│   ├── backend-tests.yml
│   ├── frontend-ci.yml
│   ├── build-sidecar.yml           # PyInstaller sidecar CI
│   └── release.yml                 # Tag-driven desktop release
└── scripts/
    └── generate-updater-keypair.sh # Ed25519 keypair for auto-updater
```

## Desktop app

A Tauri 2 wrapper bundles the frontend and backend into a native desktop
application. The Python backend is compiled to a standalone binary via
PyInstaller and spawned as a sidecar — no Python installation required.

### Dev mode

```bash
cd frontend && pnpm tauri dev
```

Requires the FastAPI server running on `:8000` (`python -m spotify_to_ytmusic.api.server`).

### Creating a standalone executable

To produce a `.msi`/`.exe` (Windows) or `.deb`/`.AppImage` (Linux)
installer that users can run without any dev tools:

1. **Build the sidecar** (the Python backend as a standalone binary):

   ```bash
   pip install -e backend/.[api] pyinstaller>=6
   python backend/scripts/build_sidecar.py
   ```

   The binary lands in `frontend/src-tauri/binaries/`.

2. **Build the Tauri bundle:**

   ```bash
   cd frontend
   pnpm tauri build
   ```

   Outputs the installer in `frontend/src-tauri/target/release/bundle/`.

Full CI/CD pipeline and release workflow details are in
[PACKAGING.md](PACKAGING.md).

### Data persistence

The app stores the following files in the platform's standard app data
directory (set via `SPOTIFY_TO_YTMUSIC_DATA_DIR`):

| File | Purpose |
|------|---------|
| `browser.json` | YouTube Music authentication headers |
| `.cache` | Spotify OAuth token |
| `track_cache.json` | Persistent YouTube Music search cache |
| `migration_report_*.json` | Migration reports |

On Linux, `.cache` and `browser.json` are restricted to `0o600` permissions.

### Auto-updater

The app checks for updates at startup against GitHub Releases. Releases
are signed with an Ed25519 keypair. See
[`scripts/generate-updater-keypair.sh`](scripts/generate-updater-keypair.sh)
for keypair generation instructions.

## License

MIT
