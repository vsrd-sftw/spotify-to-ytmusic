import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeQueryWrapper } from '@/test/queryWrapper';
import { useReports } from './useReports';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

describe('useReports', () => {
  it('fetches reports successfully', async () => {
    const { result } = renderHook(() => useReports(), {
      wrapper: makeQueryWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].playlists).toHaveLength(1);
  });

  it('handles fetch error', async () => {
    server.use(
      http.get('*/api/reports', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useReports(), {
      wrapper: makeQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('returns empty array when no reports', async () => {
    server.use(
      http.get('*/api/reports', () => HttpResponse.json([])),
    );

    const { result } = renderHook(() => useReports(), {
      wrapper: makeQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});
