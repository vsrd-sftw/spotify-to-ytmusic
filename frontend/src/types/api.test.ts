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
    case 'PlaylistCreationFailed':
      return `failed creating ${event.name}: ${event.reason}`;
    case 'PlaylistChunkFailed':
      return `chunk ${event.chunkIndex}/${event.totalChunks} failed in ${event.name}`;
    case 'AlbumSaveFailed':
      return `failed saving ${event.label}: ${event.reason}`;
    case 'MigrationFinished':
      return `migration finished (report ${event.reportId})`;
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
      { type: 'PlaylistCreationFailed', name: 'p', reason: 'err' },
      { type: 'PlaylistChunkFailed', name: 'p', chunkIndex: 0, totalChunks: 1, reason: 'err' },
      { type: 'AlbumSaveFailed', label: 'a - b', reason: 'err' },
      { type: 'MigrationFinished', reportId: '20260306_141532' },
    ];
    expect(events.map(describeEvent)).toHaveLength(9);
  });
});
