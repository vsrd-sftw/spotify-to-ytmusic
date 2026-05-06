import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { samplePlaylists } from '@/test/msw/fixtures';
import { makeQueryWrapper } from '@/test/queryWrapper';
import { usePlaylists } from './usePlaylists';

describe('usePlaylists', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper: makeQueryWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('returns playlist data on success', async () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper: makeQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(samplePlaylists);
  });

  it('returns empty array when server returns no playlists', async () => {
    server.use(http.get('*/api/playlists', () => HttpResponse.json([])));
    const { result } = renderHook(() => usePlaylists(), { wrapper: makeQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('sets isError on HTTP failure', async () => {
    server.use(http.get('*/api/playlists', () => HttpResponse.json({}, { status: 500 })));
    const { result } = renderHook(() => usePlaylists(), { wrapper: makeQueryWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
