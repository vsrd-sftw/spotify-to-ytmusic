/** Tauri desktop bridge — lazy-loads @tauri-apps/api only when running in Tauri. */

let _isTauri: boolean | null = null

export function isTauri(): boolean {
  if (_isTauri === null) {
    _isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  }
  return _isTauri
}

let _cachedBaseUrl: string | null = null

/** Return the API base URL. In the Tauri desktop app this resolves the sidecar
 *  port via IPC; in the browser it reads `VITE_API_BASE_URL` or defaults to
 *  `/api`. The result is cached after the first successful resolution. */
export async function getBaseUrl(): Promise<string> {
  if (_cachedBaseUrl) return _cachedBaseUrl

  if (isTauri()) {
    // Vite dev server (pnpm tauri dev) proxies /api → backend.
    // Bypassing it and going direct to 127.0.0.1:8000 fails because the
    // Tauri webview can't reach the host network that way.
    if (window.location.port === '5173') {
      _cachedBaseUrl = '/api'
      return _cachedBaseUrl
    }

    const { invoke } = await import('@tauri-apps/api/core')
    const port: number = await invoke('get_server_port')
    _cachedBaseUrl = `http://127.0.0.1:${port}/api`
    return _cachedBaseUrl
  }

  const fromEnv = import.meta.env.VITE_API_BASE_URL
  _cachedBaseUrl = typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : '/api'
  return _cachedBaseUrl
}
