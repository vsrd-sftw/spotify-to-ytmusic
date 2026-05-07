import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/Toast';
import { server } from '@/test/msw/server';
import { spotifyAuthErrorHandler } from '@/test/msw/handlers';
import { useSpotifyAuth } from './useSpotifyAuth';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

let assignSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  assignSpy = vi.fn();
  Object.defineProperty(window, 'location', {
    value: { ...window.location, assign: assignSpy },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSpotifyAuth', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useSpotifyAuth(), { wrapper });
    expect(result.current.state).toBe('idle');
    expect(result.current.errorMessage).toBeNull();
  });

  it('redirects to the auth URL on success', async () => {
    const { result } = renderHook(() => useSpotifyAuth(), { wrapper });

    await act(async () => {
      result.current.connect();
    });

    expect(result.current.state).toBe('success');
    expect(assignSpy).toHaveBeenCalledWith('http://127.0.0.1:8888/auth/spotify');
    expect(result.current.errorMessage).toBeNull();
  });

  it('sets error state and message on HTTP error', async () => {
    server.use(spotifyAuthErrorHandler);

    const { result } = renderHook(() => useSpotifyAuth(), { wrapper });

    await act(async () => {
      result.current.connect();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.errorMessage).toBe('Error de configuración');
    expect(assignSpy).not.toHaveBeenCalled();
  });
});
