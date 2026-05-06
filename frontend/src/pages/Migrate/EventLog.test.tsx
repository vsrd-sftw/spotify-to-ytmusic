import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventLog } from './EventLog';

vi.mock('@/hooks/useMigrationEvents', () => ({
  useMigrationEvents: () => ({
    events: [
      { type: 'PlaylistsDiscovered', count: 2 },
      { type: 'PlaylistStarted', name: 'My Playlist', trackCount: 10 },
      { type: 'PlaylistFinished', name: 'My Playlist', found: 8, total: 10, notFoundLabels: [] },
    ],
    state: 'open',
    close: vi.fn(),
  }),
}));

describe('EventLog', () => {
  it('renders connection state badge', () => {
    render(<EventLog jobId="job-123" />);

    expect(screen.getByText(/En vivo/)).toBeInTheDocument();
  });

  it('renders events list', () => {
    render(<EventLog jobId="job-123" />);

    expect(screen.getByText(/Descubiertas 2 playlists/)).toBeInTheDocument();
    expect(screen.getByText(/Iniciando "My Playlist"/)).toBeInTheDocument();
    expect(screen.getByText(/Finalizada "My Playlist": 8\/10/)).toBeInTheDocument();
  });
});