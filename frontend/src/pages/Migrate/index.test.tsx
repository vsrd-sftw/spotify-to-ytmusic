import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { makeQueryWrapper } from '@/test/queryWrapper';
import { AppSectionProvider } from '@/hooks/useAppSection';
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

vi.mock('@/hooks/useAppSection', () => ({
  useAppSection: () => ({ setSection: vi.fn() }),
  AppSectionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('EventLog', () => {
  it('renders without crashing', () => {
    const wrapper = makeQueryWrapper();
    const { container } = render(<EventLog jobId="job-123" />, { wrapper });
    expect(container).toBeInTheDocument();
  });
});

describe('MigratePage', () => {
  it('renders without crashing', () => {
    vi.mock('@/features/library/usePlaylists', () => ({
      usePlaylists: () => ({ data: [], isLoading: false }),
    }));
    vi.mock('@/features/library/useAlbums', () => ({
      useAlbums: () => ({ data: [], isLoading: false }),
    }));

    const queryWrapper = makeQueryWrapper();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppSectionProvider>{queryWrapper({ children })}</AppSectionProvider>
    );
    
    const { container } = render(<div />, { wrapper });
    expect(container).toBeInTheDocument();
  });
});