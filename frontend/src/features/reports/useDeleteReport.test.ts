import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeQueryWrapper } from '@/test/queryWrapper';
import { useDeleteReport } from './useDeleteReport';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

describe('useDeleteReport', () => {
  it('deletes a report successfully', async () => {
    const { result } = renderHook(() => useDeleteReport(), {
      wrapper: makeQueryWrapper(),
    });

    expect(result.current.isIdle).toBe(true);

    act(() => {
      result.current.mutate('rep_1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.ok).toBe(true);
  });

  it('handles delete error', async () => {
    server.use(
      http.delete('*/api/reports/:id', () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );

    const { result } = renderHook(() => useDeleteReport(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => {
      result.current.mutate('nonexistent');
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
