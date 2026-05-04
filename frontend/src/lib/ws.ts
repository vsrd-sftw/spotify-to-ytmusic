const DEFAULT_BASE_URL = '/api';

function getBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  return typeof fromEnv === 'string' && fromEnv.length > 0
    ? fromEnv
    : DEFAULT_BASE_URL;
}

export function resolveWsUrl(path: string): string {
  const base = getBaseUrl();
  const suffix = path.startsWith('/') ? path : `/${path}`;

  if (/^https?:\/\//i.test(base)) {
    return base.replace(/^http/i, 'ws').replace(/\/$/, '') + suffix;
  }
  if (/^wss?:\/\//i.test(base)) {
    return base.replace(/\/$/, '') + suffix;
  }

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const cleanBase = base.replace(/\/$/, '');
  return `${proto}//${host}${cleanBase}${suffix}`;
}
