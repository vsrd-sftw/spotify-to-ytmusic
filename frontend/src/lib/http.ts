import { getBaseUrl } from './tauri'

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
  // AbortSignal.any is available in Node 20+ and modern browsers
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([timeoutSignal, external])
  }
  return timeoutSignal
}

async function request<T>(
  path: string,
  init: RequestInit,
  options: { timeoutMs?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const signal = timeoutMs > 0 ? combineSignals(timeoutMs, init.signal) : init.signal
  // Network failures (DNS, offline, MSW HttpResponse.error) surface as TypeError
  // from fetch — we let them propagate so callers can distinguish them from
  // HttpError (which always carries a real status). Timeout/abort surface as
  // a DOMException whose `name` is `TimeoutError` or `AbortError`.
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
    const { init, timeoutMs } = splitOptions(options)
    return request<T>(path, { ...init, method: 'GET' }, { timeoutMs })
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const { init, timeoutMs } = splitOptions(options)
    const headers = new Headers(init.headers)
    if (body !== undefined && !headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }
    return request<T>(
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
    const { init, timeoutMs } = splitOptions(options)
    return request<T>(path, { ...init, method: 'DELETE' }, { timeoutMs })
  },
}
