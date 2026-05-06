import { getBaseUrl } from './tauri'

export async function resolveWsUrl(path: string): Promise<string> {
  const base = await getBaseUrl()
  const suffix = path.startsWith('/') ? path : `/${path}`

  if (/^https?:\/\//i.test(base)) {
    return base.replace(/^http/i, 'ws').replace(/\/$/, '') + suffix
  }
  if (/^wss?:\/\//i.test(base)) {
    return base.replace(/\/$/, '') + suffix
  }

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const cleanBase = base.replace(/\/$/, '')
  return `${proto}//${host}${cleanBase}${suffix}`
}

export interface ReconnectConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
}

const DEFAULT_RECONNECT: ReconnectConfig = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
}

export class WsConnection {
  private socket: WebSocket | null = null
  private url: string
  private config: ReconnectConfig
  private retryCount = 0
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private manualClose = false

  onMessage: ((data: unknown) => void) | null = null
  onStateChange: ((state: WsConnectionState) => void) | null = null

  constructor(url: string, config: Partial<ReconnectConfig> = {}) {
    this.url = url
    this.config = { ...DEFAULT_RECONNECT, ...config }
  }

  connect() {
    this.manualClose = false
    this.onStateChange?.('connecting')
    this.createSocket()
  }

  close() {
    this.manualClose = true
    this.clearTimeout()
    this.socket?.close()
    this.socket = null
  }

  resetRetry() {
    this.retryCount = 0
  }

  getRetryCount(): number {
    return this.retryCount
  }

  isExhausted(): boolean {
    return this.retryCount >= this.config.maxRetries
  }

  private createSocket() {
    this.clearTimeout()
    this.socket = new WebSocket(this.url)

    this.socket.onopen = () => {
      this.resetRetry()
      this.onStateChange?.('open')
    }

    this.socket.onmessage = (ev: MessageEvent) => {
      this.onMessage?.(ev.data)
    }

    this.socket.onclose = (ev: CloseEvent) => {
      if (this.manualClose) {
        this.onStateChange?.('closed')
        return
      }
      // 1000 = normal closure, 1005 = no status received but clean.
      // Treat both as the server intentionally ending the stream — no reconnect.
      if (ev.wasClean || ev.code === 1000 || ev.code === 1005) {
        this.onStateChange?.('closed')
        return
      }
      this.scheduleReconnect()
    }

    this.socket.onerror = () => {
      this.onStateChange?.('error')
    }
  }

  private scheduleReconnect() {
    this.retryCount++

    if (this.retryCount >= this.config.maxRetries) {
      this.onStateChange?.('exhausted')
      return
    }

    const delay = Math.min(
      this.config.initialDelayMs * 2 ** (this.retryCount - 1),
      this.config.maxDelayMs,
    )

    this.onStateChange?.('reconnecting')
    this.timeoutId = setTimeout(() => {
      this.createSocket()
    }, delay)
  }

  private clearTimeout() {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }
}

export type WsConnectionState =
  | 'connecting'
  | 'open'
  | 'closed'
  | 'error'
  | 'reconnecting'
  | 'exhausted'
