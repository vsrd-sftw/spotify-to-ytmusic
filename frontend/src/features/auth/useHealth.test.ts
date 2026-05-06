import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw/server';
import { healthWithServicesHandler } from '@/test/msw/handlers';
import { http, HttpResponse } from 'msw';
import { makeQueryWrapper } from '@/test/queryWrapper';
import { useHealth } from './useHealth';

describe('useHealth', () => {
  it('returns unknown for both services while loading', () => {
    const { result } = renderHook(() => useHealth(), { wrapper: makeQueryWrapper() });
    expect(result.current.spotify).toBe('unknown');
    expect(result.current.ytmusic).toBe('unknown');
  });

  it('returns connected/disconnected when health response has service fields', async () => {
    server.use(healthWithServicesHandler);
    const { result } = renderHook(() => useHealth(), { wrapper: makeQueryWrapper() });
    await waitFor(() => {
      expect(result.current.spotify).toBe('connected');
    });
    expect(result.current.ytmusic).toBe('disconnected');
  });

  it('returns unknown when health response lacks service fields', async () => {
    const { result } = renderHook(() => useHealth(), { wrapper: makeQueryWrapper() });
    await waitFor(() => {
      // default handler returns { ok: true } with no spotify/ytmusic fields
      expect(result.current.spotify).toBe('unknown');
      expect(result.current.ytmusic).toBe('unknown');
    });
  });

  it('returns unknown for both when request fails', async () => {
    server.use(http.get('*/api/health', () => HttpResponse.json({}, { status: 500 })));
    const { result } = renderHook(() => useHealth(), { wrapper: makeQueryWrapper() });
    await waitFor(() => {
      expect(result.current.spotify).toBe('unknown');
      expect(result.current.ytmusic).toBe('unknown');
    });
  });
});
