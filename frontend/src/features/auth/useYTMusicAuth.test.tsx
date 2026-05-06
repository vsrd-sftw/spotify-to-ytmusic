import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { server } from '@/test/msw/server';
import { ytmusicAuthErrorHandler } from '@/test/msw/handlers';
import { useYTMusicAuth } from './useYTMusicAuth';

const VALID_HEADERS = 'cookie: sid=abc\nuser-agent: Mozilla/5.0';

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
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

  it('shows error and stays idle when headers lack cookie or user-agent', () => {
    const { result } = renderHook(() => useYTMusicAuth(), { wrapper });
    act(() => {
      result.current.connect('authorization: Bearer token');
    });
    expect(result.current.state).toBe('idle');
    expect(result.current.errorMessage).toMatch(/cookie/i);
  });

  it('reaches success state on valid headers', async () => {
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
