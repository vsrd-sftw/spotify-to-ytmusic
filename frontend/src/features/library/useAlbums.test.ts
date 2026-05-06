import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { sampleAlbums } from '@/test/msw/fixtures';
import { makeQueryWrapper } from '@/test/queryWrapper';
import { useAlbums } from './useAlbums';

describe('useAlbums', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useAlbums(), { wrapper: makeQueryWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('returns album data on success', async () => {
    const { result } = renderHook(() => useAlbums(), { wrapper: makeQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sampleAlbums);
  });

  it('returns empty array when server returns no albums', async () => {
    server.use(http.get('*/api/albums', () => HttpResponse.json([])));
    const { result } = renderHook(() => useAlbums(), { wrapper: makeQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('sets isError on HTTP failure', async () => {
    server.use(http.get('*/api/albums', () => HttpResponse.json({}, { status: 500 })));
    const { result } = renderHook(() => useAlbums(), { wrapper: makeQueryWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
