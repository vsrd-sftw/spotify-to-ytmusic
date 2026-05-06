import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeQueryWrapper } from '@/test/queryWrapper';
import { useReport } from './useReport';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

describe('useReport', () => {
  it('fetches report successfully', async () => {
    const { result } = renderHook(() => useReport('rep_1'), {
      wrapper: makeQueryWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe('rep_1');
    expect(result.current.data?.playlists).toHaveLength(1);
    expect(result.current.data?.albums).toHaveLength(1);
    expect(result.current.data?.notFound).toHaveLength(2);
  });

  it('handles fetch error', async () => {
    server.use(
      http.get('*/api/reports/:id', () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );

    const { result } = renderHook(() => useReport('nonexistent'), {
      wrapper: makeQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useReport(''), {
      wrapper: makeQueryWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('returns report with correct id from params', async () => {
    const { result } = renderHook(() => useReport('custom-id'), {
      wrapper: makeQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe('custom-id');
  });
});
