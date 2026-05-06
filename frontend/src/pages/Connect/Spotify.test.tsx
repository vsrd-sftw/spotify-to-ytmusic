import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { spotifyAuthErrorHandler } from '@/test/msw/handlers';
import { SpotifyConnect } from './Spotify';

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
    render(<SpotifyConnect />);
    expect(screen.getByRole('button', { name: /conectar con spotify/i })).toBeInTheDocument();
  });

  it('redirects to the auth URL on success', async () => {
    render(<SpotifyConnect />);
    fireEvent.click(screen.getByRole('button', { name: /conectar con spotify/i }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith('http://127.0.0.1:8888/auth/spotify');
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error message on failure', async () => {
    server.use(spotifyAuthErrorHandler);
    render(<SpotifyConnect />);
    fireEvent.click(screen.getByRole('button', { name: /conectar con spotify/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Error de configuración');
    expect(assignSpy).not.toHaveBeenCalled();
  });
});
