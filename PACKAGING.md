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
   `spotify-to-ytmusic-server-{target-triple} 53000 <host-pid>`. The
   port is fixed at `53000` (outside the Windows ephemeral range, so
   the OAuth redirect URI registered in the Spotify dashboard is
   stable). The host PID is forwarded so the sidecar's parent-watchdog
   can monitor the real Tauri process — `os.getppid()` under
   PyInstaller `--onefile` returns the bootstrap launcher's PID, not
   Tauri's, so a `getppid()`-only watchdog would miss host crashes.
2. The sidecar starts a uvicorn HTTP server on `127.0.0.1:53000` and
   prints `SERVER_LISTENING port=53000` to stdout.
3. The Tauri host captures stdout, parses the port, and uses it to
   route frontend requests through the IPC proxy
   (`invoke('proxy_request')` → Rust `ureq`).
4. **Sidecar cleanup on exit** uses three layered defenses:
   1. **Win32 Job Object** with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`
      (Windows only, [`src-tauri/src/job.rs`](frontend/src-tauri/src/job.rs)).
      The sidecar PID is assigned to the job at spawn time; when the
      host's last handle closes — clean exit, crash, or Task Manager
      kill — the OS itself terminates every process in the job. This
      is the only mechanism that reliably handles the PyInstaller
      `--onefile` bootstrap, which can leave a zombie launcher process
      otherwise.
   2. **Explicit `CommandChild::kill()`** on `RunEvent::ExitRequested`
      and `RunEvent::Exit`. Idempotent via `Option::take()` on a
      module-level `OnceLock<Mutex<Option<CommandChild>>>` (parking
      the handle in `app.manage()` was tried but raced with Tauri's
      managed-state teardown).
   3. **Parent-watchdog inside the sidecar.** Daemon thread that polls
      the Tauri PID every 2 s (after a 5 s startup grace) and exits
      via `os._exit(0)` if it disappears.

### Environment variables

| Variable | Purpose |
|---|---|
| `SPOTIFY_TO_YTMUSIC_DATA_DIR` | Path where `browser.json`, `.cache`, and reports are stored. Set by the Tauri host to `app_data_dir()`. |
| `SPOTIFY_CLIENT_ID` | Spotify application client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify application client secret |

### File permissions

On Linux, the sidecar enforces `0o600` permissions on `.cache` and
`browser.json` at startup.

### PyInstaller data files

The spec uses `collect_data_files("ytmusicapi")` to bundle the gettext
`.mo` translation files under `ytmusicapi/locales/<lang>/LC_MESSAGES/`.
Without those files, every `YTMusic()` construction throws
`FileNotFoundError: No translation file found for domain: 'base'` at
runtime, surfacing as `ytmusic:false` on `/api/health` even with a
valid `browser.json`. If you add new dependencies that load data
files (icons, locales, templates), make sure the spec collects them.

### Diagnosing a stuck "Desconectado" badge

`_check_ytmusic` in `health.py` writes the full traceback to
`<data_dir>/ytmusic_health.log` whenever it fails. If the YT Music
badge is stuck on "Desconectado" with valid headers, check that file
first — it captures the underlying exception (missing data file,
broken import, expired session) instead of leaving the failure
silent.

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
