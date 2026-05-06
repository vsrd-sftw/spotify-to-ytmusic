import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { samplePlaylists } from '@/test/msw/fixtures';
import { makeQueryWrapper } from '@/test/queryWrapper';
import { Playlists } from './Playlists';

function renderComponent(props: Partial<React.ComponentProps<typeof Playlists>> = {}) {
  return render(<Playlists {...props} />, { wrapper: makeQueryWrapper() });
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

  describe('selection', () => {
    it('renders select-all checkbox when onToggleAll is provided', async () => {
      renderComponent({ onToggleAll: vi.fn(), onToggle: vi.fn(), selectionState: 'none' });
      await waitFor(() => expect(screen.getByText(samplePlaylists[0].name)).toBeInTheDocument());
      expect(screen.getByRole('checkbox', { name: /seleccionar todas las playlists/i })).toBeInTheDocument();
    });

    it('calls onToggleAll when select-all checkbox is clicked', async () => {
      const onToggleAll = vi.fn();
      renderComponent({ onToggleAll, onToggle: vi.fn(), selectionState: 'none' });
      await waitFor(() => expect(screen.getByText(samplePlaylists[0].name)).toBeInTheDocument());
      fireEvent.click(screen.getByRole('checkbox', { name: /seleccionar todas las playlists/i }));
      expect(onToggleAll).toHaveBeenCalledOnce();
    });

    it('select-all checkbox is checked when selectionState is all', async () => {
      const ids = new Set(samplePlaylists.map((p) => p.id));
      renderComponent({ onToggleAll: vi.fn(), onToggle: vi.fn(), selectedIds: ids, selectionState: 'all' });
      await waitFor(() => expect(screen.getByText(samplePlaylists[0].name)).toBeInTheDocument());
      const checkbox = screen.getByRole('checkbox', { name: /seleccionar todas las playlists/i }) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
      expect(checkbox.indeterminate).toBe(false);
    });

    it('calls onToggle when a row checkbox is clicked', async () => {
      const onToggle = vi.fn();
      renderComponent({ onToggle, onToggleAll: vi.fn(), selectionState: 'none' });
      await waitFor(() => expect(screen.getByText(samplePlaylists[0].name)).toBeInTheDocument());
      const checkbox = screen.getByRole('checkbox', { name: new RegExp(`seleccionar ${samplePlaylists[0].name}`, 'i') });
      fireEvent.click(checkbox);
      expect(onToggle).toHaveBeenCalledWith(samplePlaylists[0].id);
    });
  });
});
