# backend

Python package, CLI, and (planned) FastAPI server for migrating a Spotify
library to YouTube Music.

## Requirements

- Python 3.10+
- A [Spotify Developer](https://developer.spotify.com/dashboard) app
- A YouTube Music account logged in on a browser

## Installation

```bash
cd backend
pip install -e .
```

This installs the `spotify_to_ytmusic` package in editable mode and registers
a `spotify-to-ytmusic` console script. For the (planned) FastAPI server:

```bash
pip install -e ".[api]"
```

## Configuration

### 1. Spotify credentials

Copy `.env.example` to `.env` and fill in your app credentials:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback
```

To get the credentials:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   and create an app.
2. Add `http://127.0.0.1:8888/callback` to the **Redirect URIs**.
3. Copy the **Client ID** and **Client Secret** into `.env`.

### 2. YouTube Music authentication

Run the setup script once to capture the request headers from your browser
session:

```bash
python setup_ytmusic.py
```

The script will guide you through:

1. Open https://music.youtube.com (logged in).
2. Open DevTools (F12) → Network tab → reload the page.
3. Filter for `/browse` and click any POST request to `/youtubei/v1/...`.
4. Copy the request headers (Request Headers panel) and paste them into the terminal.
5. Press Enter, Ctrl+Z, Enter on Windows (Ctrl+D on Linux/Mac) to finish.

A `data/browser.json` file is created with your session.

> Browser sessions expire periodically. If you start seeing authentication
> errors, run `setup_ytmusic.py` again.

## Usage

```bash
# Migrate everything (all playlists + saved albums, no prompts)
python main.py --all

# Choose which playlists to migrate from an interactive checkbox list
python main.py --playlists

# Migrate saved albums only
python main.py --albums

# Or via the installed entry point:
spotify-to-ytmusic --all
```

When using `--playlists`, the CLI lists every playlist in your library with its
track count and whether you own it, then opens a multi-select prompt:

```
Encontradas 151 playlists

? Selecciona las playlists a migrar (espacio para marcar, enter para confirmar)
  ❯ ◯ My top tracks playlist  ·  5 tracks  ·  mía
    ◯ ol' kanye beats  ·  4 tracks  ·  mía
    ◯ horny  ·  35 tracks  ·  ajena
    ...
```

Tracks are only fetched from Spotify for the playlists you actually pick — the
listing itself is near-instant even for large libraries.

On first run, Spotify will open a browser for OAuth authorization. The token
is cached in `data/.cache`.

## Output

After migration, a report is saved to `data/migration_report_<timestamp>.json`:

```json
{
  "playlists": [
    { "name": "My Playlist", "total": 42, "found": 39, "yt_playlist_id": "PLxxx" }
  ],
  "albums": [
    { "label": "Artist - Album", "status": "saved" }
  ],
  "not_found": [
    { "context": "playlist:My Playlist", "item": "Artist - Track Name" }
  ]
}
```

`status` for albums is one of `saved`, `found (not saved)`. Items that
couldn't be found at all on YouTube Music are listed under `not_found`.

## Architecture

The `Migrator` is event-driven: it accepts an `on_event` callback that
receives typed events (`PlaylistStarted`, `AlbumProcessed`, ...). The CLI
uses this to print progress; a future FastAPI WebSocket endpoint will use
the same hook to stream progress to the frontend.

```
core/
├── config.py          # Constants (rate limits, page sizes, paths)
├── models.py          # Domain types (Track, Playlist, PlaylistSummary, ...)
├── events.py          # MigrationEvent variants
├── text.py            # normalize() for fuzzy matching
├── headers_parser.py  # Browser headers → ytmusicapi format
├── spotify_client.py  # Wraps spotipy; lists summaries fast, loads tracks on demand
├── ytmusic_client.py  # Wraps ytmusicapi (search, save, create)
├── migrator.py        # Orchestrator (no I/O presentation)
└── report.py          # JSON serialization
cli/                   # argparse + interactive selector + event-to-print mapping
api/                   # (planned) FastAPI app
```

`SpotifyClient` separates discovery from track loading: `list_playlist_summaries()`
returns lightweight metadata (name, track count, owner) for the whole library in
a single paginated call, and `load_playlist_by_id()` fetches the actual tracks
only when a playlist is going to be migrated.

## Data directory

State files live under `backend/data/` by default. Override with:

```bash
export SPOTIFY_TO_YTMUSIC_DATA_DIR=/path/to/state
```

Files written there:

- `browser.json` — YouTube Music session
- `.cache` — Spotify OAuth refresh token
- `migration_report_*.json` — One per run

The whole `data/` directory is gitignored.

## Limitations

- Track matching is based on title and artist name. Tracks with significant
  naming differences between platforms may not be found.
- YouTube Music search has no fuzzy matching, so uncommon releases or regional
  titles can be missed.
- Browser-based authentication expires periodically; rerun `setup_ytmusic.py`
  to refresh `browser.json`.
- Duplicate detection is not performed — running the migration twice will
  create duplicate playlists on YouTube Music.
