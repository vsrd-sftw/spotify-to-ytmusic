import { describe, expect, it } from 'vitest';
import type { MigrationEvent } from './api';

function describeEvent(event: MigrationEvent): string {
  switch (event.type) {
    case 'PlaylistsDiscovered':
      return `discovered ${event.count} playlists`;
    case 'PlaylistStarted':
      return `started ${event.name} (${event.trackCount})`;
    case 'PlaylistFinished':
      return `finished ${event.name}: ${event.found}/${event.total}`;
    case 'AlbumsDiscovered':
      return `discovered ${event.count} albums`;
    case 'AlbumProcessed':
      return `${event.label}: ${event.status}`;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

describe('MigrationEvent', () => {
  it('discriminates every variant exhaustively', () => {
    const events: MigrationEvent[] = [
      { type: 'PlaylistsDiscovered', count: 3 },
      { type: 'PlaylistStarted', name: 'p', trackCount: 1 },
      {
        type: 'PlaylistFinished',
        name: 'p',
        found: 1,
        total: 1,
        notFoundLabels: [],
      },
      { type: 'AlbumsDiscovered', count: 2 },
      { type: 'AlbumProcessed', label: 'a - b', status: 'saved' },
    ];
    expect(events.map(describeEvent)).toHaveLength(5);
  });
});
