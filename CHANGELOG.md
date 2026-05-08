# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] — 2026-05-08

### Fixed

- **Sidecar process persisted after closing the desktop app** (#98). The
  PyInstaller `--onefile` bootstrap could leave a zombie launcher
  process when the runtime was killed via `TerminateProcess`. The sidecar
  PID is now assigned to a Win32 Job Object created with
  `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, so the OS itself terminates
  every assigned process the moment the host's last handle to the job
  closes — clean exit, host crash, or Task Manager kill.
- **YouTube Music authentication showed no feedback in packaged builds**
  (#99). `proxy_request` in the Tauri host was collapsing every non-2xx
  HTTP status into a generic `Err` string, so the JSON `{message: ...}`
  body returned by the backend never reached `HttpError` in the
  frontend. Now responses with status codes are surfaced as a normal
  `ProxyResponse`, error toasts fire as expected, and the button no
  longer gets stuck on "Conectando".
- **`/api/health` returned `ytmusic:false` even with a valid
  `browser.json`** in packaged builds. `ytmusicapi` loads gettext
  translation files on construction; PyInstaller was not bundling
  them. The spec now uses `collect_data_files("ytmusicapi")` to ship
  the `locales/` directory.
- **Sidecar's parent-watchdog was tracking the wrong PID.**
  `os.getppid()` under PyInstaller `--onefile` returns the bootstrap
  launcher's PID, not Tauri's, so the watchdog never noticed when the
  host crashed. The Tauri host now passes its real PID as `argv[2]`;
  the watchdog uses that explicitly and falls back to `getppid()` for
  the CLI path.

### Added

- Persistent diagnostic log at `<data_dir>/ytmusic_health.log` that
  captures the traceback whenever `_check_ytmusic` fails. The next
  regression in this code path is one `Get-Content` away from a fix.

### Documentation

- `CLAUDE.md` updated with the three-layer sidecar cleanup design
  (Job Object → `CommandChild::kill` → parent-watchdog), the
  `proxy_request` status-preservation contract, and the
  `collect_data_files("ytmusicapi")` requirement.
- `PACKAGING.md` reworked to reflect the fixed `:53000` port, the host
  PID handoff, and the Job Object cleanup mechanism.
- `README.md` Status section updated: YT Music auth, library browsing,
  migration, and sidecar cleanup all confirmed working in the desktop
  build.

## [0.2.2] — 2026-04-XX

### Fixed

- YT Music auth now requires `x-goog-authuser` and the sidecar handles
  cleanup more reliably (#97).

## [0.2.1] — 2026-04-XX

### Fixed

- Unblock main thread on proxy HTTP and open OAuth in the system
  browser (#96).

## [0.2.0] — 2026-03-XX

Initial Tauri 2 desktop app: PyInstaller sidecar, Spotify OAuth on
`:53000`, IPC HTTP proxy, auto-updater (#72-#74, #82).

[0.2.3]: https://github.com/vsrd-sftw/spotify-to-ytmusic/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/vsrd-sftw/spotify-to-ytmusic/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/vsrd-sftw/spotify-to-ytmusic/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/vsrd-sftw/spotify-to-ytmusic/releases/tag/v0.2.0
