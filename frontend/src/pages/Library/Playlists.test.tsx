import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { samplePlaylists } from '@/test/msw/fixtures';
import { makeQueryWrapper } from '@/test/queryWrapper';
import { Playlists } from './Playlists';

function renderComponent() {
  return render(<Playlists />, { wrapper: makeQueryWrapper() });
}

describe('Playlists', () => {
  it('shows skeleton rows while loading', () => {
    renderComponent();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('shows error message and retry button on failure', async () => {
    server.use(http.get('*/api/playlists', () => HttpResponse.json({}, { status: 500 })));
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/no se pudieron cargar/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });

  it('shows EmptyState when no playlists returned', async () => {
    server.use(http.get('*/api/playlists', () => HttpResponse.json([])));
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/no tienes playlists/i)).toBeInTheDocument();
    });
  });

  it('renders playlist names and track counts on success', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(samplePlaylists[0].name)).toBeInTheDocument();
    });
    for (const playlist of samplePlaylists) {
      expect(screen.getByText(playlist.name)).toBeInTheDocument();
      expect(screen.getByText(`${playlist.trackCount} canciones`)).toBeInTheDocument();
    }
  });
});
