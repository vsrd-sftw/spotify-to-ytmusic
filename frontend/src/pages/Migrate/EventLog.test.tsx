import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EventLog } from './EventLog';

vi.mock('@/hooks/useMigrationEvents', () => ({
  useMigrationEvents: () => ({
    events: [
      { type: 'PlaylistsDiscovered', count: 2 },
      { type: 'PlaylistStarted', name: 'My Playlist', trackCount: 10 },
      { type: 'PlaylistFinished', name: 'My Playlist', found: 8, total: 10, notFoundLabels: [] },
    ],
    playlists: [],
    totalPlaylistsDiscovered: 2,
    albums: [],
    totalAlbumsDiscovered: 0,
    savedCount: 0,
    foundCount: 0,
    notFoundLabels: [],
    summary: {
      tracksFound: 8,
      tracksTotal: 10,
      albumsFound: 0,
      albumsTotal: 0,
      notFoundCount: 0,
    },
    state: 'open',
    close: vi.fn(),
    retry: vi.fn(),
    retryCount: 0,
  }),
}));

describe('EventLog', () => {
  it('renders connection state badge', () => {
    render(
      <MemoryRouter>
        <EventLog jobId="job-123" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/En vivo/)).toBeInTheDocument();
  });

  it('renders events list', () => {
    render(
      <MemoryRouter>
        <EventLog jobId="job-123" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Descubiertas 2 playlists/)).toBeInTheDocument();
    expect(screen.getByText(/Iniciando "My Playlist"/)).toBeInTheDocument();
    expect(screen.getByText(/Finalizada "My Playlist": 8\/10/)).toBeInTheDocument();
  });
});
