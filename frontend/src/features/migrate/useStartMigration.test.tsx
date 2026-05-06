import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStartMigration } from './useStartMigration';
import { server } from '@/test/msw/server';
import { HttpResponse, http } from 'msw';

const makeQueryWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

describe('useStartMigration', () => {
  it('calls POST /api/migrate and returns jobId', async () => {
    const { wrapper } = makeQueryWrapper();

    const { result } = renderHook(() => useStartMigration(), { wrapper });

    result.current.mutate({
      playlistIds: ['playlist-1', 'playlist-2'],
      albumIds: ['album-1'],
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.jobId).toBe('job-stub-1');
    expect(result.current.error).toBeNull();
  });

  it('handles error when API returns error', async () => {
    server.use(
      http.post('*/api/migrate', () =>
        HttpResponse.json({ message: 'Error interno' }, { status: 500 }),
      ),
    );

    const { wrapper } = makeQueryWrapper();

    const { result } = renderHook(() => useStartMigration(), { wrapper });

    result.current.mutate({
      playlistIds: ['playlist-1'],
      albumIds: [],
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).not.toBeNull();
    expect(result.current.jobId).toBeUndefined();
  });

  it('calls onSuccess callback with jobId', async () => {
    const onSuccess = vi.fn();

    const { wrapper } = makeQueryWrapper();

    const { result } = renderHook(
      () => useStartMigration({ onSuccess }),
      { wrapper },
    );

    result.current.mutate({
      playlistIds: ['playlist-1'],
      albumIds: ['album-1'],
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(onSuccess).toHaveBeenCalledWith('job-stub-1');
  });
});