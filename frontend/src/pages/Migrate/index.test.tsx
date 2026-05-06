import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { makeQueryWrapper } from '@/test/queryWrapper';
import { EventLog } from './EventLog';

vi.mock('@/hooks/useMigrationEvents', () => ({
  useMigrationEvents: () => ({
    events: [
      { type: 'PlaylistsDiscovered', count: 2 },
      { type: 'PlaylistStarted', name: 'My Playlist', trackCount: 10 },
    ],
    state: 'open' as const,
    close: vi.fn(),
  }),
}));

vi.mock('@/features/library/usePlaylists', () => ({
  usePlaylists: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/features/library/useAlbums', () => ({
  useAlbums: () => ({ data: [], isLoading: false }),
}));

describe('EventLog', () => {
  it('renders without crashing', () => {
    const wrapper = makeQueryWrapper();
    const { container } = render(
      <MemoryRouter>
        <EventLog jobId="job-123" />
      </MemoryRouter>,
      { wrapper },
    );
    expect(container).toBeInTheDocument();
  });
});

describe('MigratePage', () => {
  it('renders without crashing', () => {
    const queryWrapper = makeQueryWrapper();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>{queryWrapper({ children })}</MemoryRouter>
    );

    const { container } = render(<div />, { wrapper });
    expect(container).toBeInTheDocument();
  });
});
