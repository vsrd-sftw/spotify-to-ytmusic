/** Tauri desktop bridge — lazy-loads @tauri-apps/api only when running in Tauri. */

let _isTauri: boolean | null = null

export function isTauri(): boolean {
  if (_isTauri === null) {
    _isTauri =
      typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  }
  return _isTauri
}

let _cachedBaseUrl: string | null = null

/** Return the API base URL. In dev mode (Vite) always uses the Vite proxy.
 *  In production Tauri, resolves the sidecar port via IPC. */
export async function getBaseUrl(): Promise<string> {
  if (_cachedBaseUrl) return _cachedBaseUrl

  // Vite dev server proxies /api → backend. Always use it in dev mode.
  if (import.meta.env.DEV) {
    _cachedBaseUrl = '/api'
    return _cachedBaseUrl
  }

  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    const port: number = await invoke('get_server_port')
    _cachedBaseUrl = `http://127.0.0.1:${port}/api`
    return _cachedBaseUrl
  }

  const fromEnv = import.meta.env.VITE_API_BASE_URL
  _cachedBaseUrl =
    typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : '/api'
  return _cachedBaseUrl
}
