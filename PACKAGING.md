# Packaging the Desktop Application

## Sidecar (Python backend)

The desktop app spawns the Python backend as a sidecar binary built with
[PyInstaller](https://pyinstaller.org/). The binary does not require a
Python installation.

### Building

```bash
# From the repo root, install build deps:
pip install -e backend/.[api] pyinstaller>=6

# Build the sidecar for the current platform:
python backend/scripts/build_sidecar.py

# Clean build:
python backend/scripts/build_sidecar.py --clean
```

The binary is written to `frontend/src-tauri/binaries/`.

### How it works

1. The Tauri host spawns the sidecar with
   `spotify-to-ytmusic-server-{target-triple} <port>`, where `<port>` is
   `0` (pick a random free port).
2. The sidecar starts a uvicorn HTTP server on `127.0.0.1:<port>` and
   prints `SERVER_LISTENING port=<n>` to stdout.
3. The Tauri host captures stdout, parses the port, and uses it to route
   frontend requests.
4. On app exit, the Tauri host kills the sidecar process.

### Environment variables

| Variable | Purpose |
|---|---|
| `SPOTIFY_TO_YTMUSIC_DATA_DIR` | Path where `browser.json`, `.cache`, and reports are stored. Set by the Tauri host to `app_data_dir()`. |
| `SPOTIFY_CLIENT_ID` | Spotify application client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify application client secret |

### File permissions

On Linux, the sidecar enforces `0o600` permissions on `.cache` and
`browser.json` at startup.

### CI

The `.github/workflows/build-sidecar.yml` workflow builds the sidecar for
Windows and Linux on every push that touches `backend/`.

## Tauri shell

The desktop app is built with [Tauri 2](https://tauri.app/).

### Development

```bash
cd frontend
pnpm install
pnpm tauri dev
```

### Production build

```bash
cd frontend
pnpm tauri build
```

Produces:
- **Windows:** `.msi` installer and `.exe` portable
- **Linux:** `.deb` and `.AppImage`

### Release workflow

Pushing a tag matching `v*` triggers `.github/workflows/release.yml`,
which:

1. Builds the sidecar for all platforms
2. Builds the Tauri bundle
3. Signs with an Ed25519 key
4. Publishes to GitHub Releases with `latest.json` for the auto-updater
