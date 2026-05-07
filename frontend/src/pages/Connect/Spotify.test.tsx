import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/Toast';
import { server } from '@/test/msw/server';
import { spotifyAuthErrorHandler } from '@/test/msw/handlers';
import { SpotifyConnect } from './Spotify';

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

vi.mock('@/features/auth/useSpotifySetup', () => ({
  useSpotifySetup: () => ({ configured: true, state: 'idle' as const, errorMessage: null, save: vi.fn() }),
}));

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

describe('SpotifyConnect', () => {
  it('renders the connect button', () => {
    render(<SpotifyConnect />, { wrapper });
    expect(screen.getByRole('button', { name: /conectar con spotify/i })).toBeInTheDocument();
  });

  it('redirects to the auth URL on success', async () => {
    render(<SpotifyConnect />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /conectar con spotify/i }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith('http://127.0.0.1:8888/auth/spotify');
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error message on failure', async () => {
    server.use(spotifyAuthErrorHandler);
    render(<SpotifyConnect />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /conectar con spotify/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Error de configuración');
    expect(assignSpy).not.toHaveBeenCalled();
  });
});
