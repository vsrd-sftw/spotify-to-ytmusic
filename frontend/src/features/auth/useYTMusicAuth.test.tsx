import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/Toast';
import { server } from '@/test/msw/server';
import { ytmusicAuthErrorHandler } from '@/test/msw/handlers';
import { useYTMusicAuth } from './useYTMusicAuth';

const VALID_HEADERS = 'cookie: sid=abc\nuser-agent: Mozilla/5.0';

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useYTMusicAuth', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useYTMusicAuth(), { wrapper });
    expect(result.current.state).toBe('idle');
    expect(result.current.errorMessage).toBeNull();
  });

  it('shows error and stays idle when headers are empty', () => {
    const { result } = renderHook(() => useYTMusicAuth(), { wrapper });
    act(() => {
      result.current.connect('');
    });
    expect(result.current.state).toBe('idle');
    expect(result.current.errorMessage).toMatch(/headers/i);
  });

  it('sets error state on HTTP error', async () => {
    const { result } = renderHook(() => useYTMusicAuth(), { wrapper });
    await act(async () => {
      result.current.connect(VALID_HEADERS);
    });
    expect(result.current.state).toBe('success');
    expect(result.current.errorMessage).toBeNull();
  });

  it('sets error state and message on HTTP error', async () => {
    server.use(ytmusicAuthErrorHandler);
    const { result } = renderHook(() => useYTMusicAuth(), { wrapper });
    await act(async () => {
      result.current.connect(VALID_HEADERS);
    });
    expect(result.current.state).toBe('error');
    expect(result.current.errorMessage).toBe('Error al guardar headers');
  });
});
