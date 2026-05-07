import { getBaseUrl, isTauri } from './tauri'

export class HttpError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `HTTP ${status}`)
    this.name = 'HttpError'
    this.status = status
    this.body = body
  }
}

export const DEFAULT_TIMEOUT_MS = 15_000

export type RequestOptions = Omit<RequestInit, 'body'> & {
  timeoutMs?: number
}

interface ProxyResponse {
  status: number
  body: unknown
}

async function tauriRequest<T>(method: string, path: string, bodyStr?: string): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  const resp: ProxyResponse = await invoke('proxy_request', {
    method,
    path: path.startsWith('/') ? path : `/${path}`,
    body: bodyStr ?? null,
  })
  if (resp.status < 200 || resp.status >= 300) {
    throw new HttpError(resp.status, resp.body)
  }
  return resp.body as T
}

async function resolveUrl(path: string): Promise<string> {
  if (/^[a-z]+:\/\//i.test(path)) return path
  const base = (await getBaseUrl()).replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}

async function readErrorBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function parseOk<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

function combineSignals(timeoutMs: number, external?: AbortSignal | null): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  if (!external) return timeoutSignal
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([timeoutSignal, external])
  }
  return timeoutSignal
}

async function webRequest<T>(
  path: string,
  init: RequestInit,
  options: { timeoutMs?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const signal = timeoutMs > 0 ? combineSignals(timeoutMs, init.signal) : init.signal
  const res = await fetch(await resolveUrl(path), { ...init, signal })
  if (!res.ok) {
    const body = await readErrorBody(res)
    throw new HttpError(res.status, body)
  }
  return parseOk<T>(res)
}

function splitOptions(options?: RequestOptions): {
  init: RequestInit
  timeoutMs?: number
} {
  if (!options) return { init: {} }
  const { timeoutMs, ...init } = options
  return { init, timeoutMs }
}

export const http = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    if (isTauri()) return tauriRequest<T>('GET', path)
    const { init, timeoutMs } = splitOptions(options)
    return webRequest<T>(path, { ...init, method: 'GET' }, { timeoutMs })
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    if (isTauri()) {
      return tauriRequest<T>(
        'POST',
        path,
        body !== undefined ? JSON.stringify(body) : undefined,
      )
    }
    const { init, timeoutMs } = splitOptions(options)
    const headers = new Headers(init.headers)
    if (body !== undefined && !headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }
    return webRequest<T>(
      path,
      {
        ...init,
        method: 'POST',
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      { timeoutMs },
    )
  },
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    if (isTauri()) return tauriRequest<T>('DELETE', path)
    const { init, timeoutMs } = splitOptions(options)
    return webRequest<T>(path, { ...init, method: 'DELETE' }, { timeoutMs })
  },
}
