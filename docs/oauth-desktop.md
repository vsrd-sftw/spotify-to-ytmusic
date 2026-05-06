# Desktop OAuth Strategy

Spotify requires pre-registered redirect URIs and does not support port
wildcards. The desktop app has a dynamic API port (the sidecar), which
means the redirect URI is not known until runtime.

## Evaluated Strategies

### A — Fixed port (53682)

The sidecar opens a mini-listener on a fixed, hardcoded port (e.g.
`53682`) dedicated solely to receiving the OAuth callback. After the
callback is handled, the listener is torn down.

| Pro | Con |
|-----|-----|
| Simple to implement | Port conflict with other apps |
| No browser involvement | Another app may already use 53682 |
| Works with any Spotify app | Less user-friendly than native flows |

**Fallback**: try 53682, then 53683, then 53684, etc.

### B — Tauri deep link (`spotify-to-ytmusic://`)

Register a custom protocol scheme with the OS. After the browser redirects
to `spotify-to-ytmusic://callback?code=...&state=...`, Tauri intercepts the
deep link and passes the query parameters to the Rust backend, which
relays them to the sidecar API.

| Pro | Con |
|-----|-----|
| Clean, native experience | Spotify may not accept custom schemes |
| No port conflicts | Requires OS-level registration |
| Already used by Tauri apps in production | More complex fallback logic |

## Decision: Strategy B with fallback to A

1. **Primary**: deep link `spotify-to-ytmusic://callback` is registered in
   `tauri.conf.json` and the Spotify dashboard.
2. **If Spotify rejects custom schemes**: fall back to fixed port 53682.
3. **If 53682 is taken**: scan 53683–53686.

The decision is versioned: if Spotify eventually supports custom schemes
for redirect URIs, the fixed-port fallback can be removed.

## Implementation

### Backend
- `routes/auth.py`: detects the request origin. If `tauri://localhost` or
  `https://tauri.localhost`, uses the Tauri-sidecar redirect URI.
- The redirect URI is assembled from the sidecar port and the
  `/api/auth/spotify/callback` path.

### Tauri
- `tauri.conf.json` registers `spotify-to-ytmusic` as a deep link scheme.
- `main.rs` handles the deep link event, extracts `code` and `state`, and
  calls the sidecar API.

## Security

- OAuth state has a 5-minute TTL (enforced in `api/state.py`).
- State is deleted immediately after successful token exchange.
- On Linux, `data/.cache` and `data/browser.json` are set to `0o600`
  permissions at sidecar startup.
