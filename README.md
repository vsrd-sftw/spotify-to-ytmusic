# spotify-to-ytmusic

Migrate your Spotify library to YouTube Music — playlists and saved albums included.

This is a monorepo:

- **`backend/`** — Python package with the migration logic, CLI, and (planned) FastAPI server.
- **`frontend/`** — Web UI (planned: Vite + React + TypeScript).

## Features

- Interactive selector to pick which playlists to migrate (one, several, or all)
- Migrates Spotify playlists (including private and collaborative ones)
- Migrates your saved albums as liked albums on YouTube Music
- Track and album matching with artist-name validation and fuzzy fallbacks
- JSON report with statistics and a list of items not found
- Event-driven `Migrator` ready to drive a UI over WebSockets

## Quick start

```bash
git clone https://github.com/your-username/spotify-to-ytmusic.git
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
├── .gitignore
├── backend/
│   ├── pyproject.toml              # Installable package definition
│   ├── requirements.txt            # Pinned runtime deps (subset of pyproject)
│   ├── .env / .env.example         # Spotify credentials
│   ├── main.py                     # CLI entry point
│   ├── setup_ytmusic.py            # YouTube Music browser auth setup
│   ├── data/                       # Runtime state (gitignored)
│   │   ├── browser.json
│   │   ├── .cache                  # Spotify OAuth token cache
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
│           │   ├── migrator.py     # Event-driven orchestrator
│           │   └── report.py       # JSON report serialization
│           ├── cli/                # Console entry point
│           │   └── __init__.py
│           └── api/                # (planned) FastAPI app
│               └── __init__.py
└── frontend/                       # (planned) Vite + React + TS UI
    └── README.md
```

## License

MIT
