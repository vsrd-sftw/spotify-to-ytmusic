export class HttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_BASE_URL = '/api';

function getBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  return typeof fromEnv === 'string' && fromEnv.length > 0
    ? fromEnv
    : DEFAULT_BASE_URL;
}

function resolveUrl(path: string): string {
  if (/^[a-z]+:\/\//i.test(path)) return path;
  const base = getBaseUrl().replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

async function readErrorBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function parseOk<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  // Network failures (DNS, offline, MSW HttpResponse.error) surface as TypeError
  // from fetch — we let them propagate so callers can distinguish them from
  // HttpError (which always carries a real status).
  const res = await fetch(resolveUrl(path), init);
  if (!res.ok) {
    const body = await readErrorBody(res);
    throw new HttpError(res.status, body);
  }
  return parseOk<T>(res);
}

export const http = {
  get<T>(path: string, init?: RequestInit): Promise<T> {
    return request<T>(path, { ...init, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    if (body !== undefined && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    return request<T>(path, {
      ...init,
      method: 'POST',
      headers,
      body: body === undefined ? init?.body : JSON.stringify(body),
    });
  },
};
