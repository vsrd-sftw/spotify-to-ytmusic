import { describe, expect, it } from 'vitest';
import { reduceMigrationSummary } from './useMigrationSummary';
import type { MigrationEvent } from '@/types/api';

describe('reduceMigrationSummary', () => {
  it('aggregates track counts from playlist events', () => {
    const events: MigrationEvent[] = [
      { type: 'PlaylistStarted', name: 'P1', trackCount: 10 },
      { type: 'PlaylistStarted', name: 'P2', trackCount: 20 },
      { type: 'PlaylistFinished', name: 'P1', found: 10, total: 10, notFoundLabels: [] },
      { type: 'PlaylistFinished', name: 'P2', found: 15, total: 20, notFoundLabels: ['A', 'B'] },
    ];

    const result = reduceMigrationSummary(events);
    expect(result.tracksTotal).toBe(30);
    expect(result.tracksFound).toBe(25);
    expect(result.notFoundCount).toBe(2);
  });

  it('aggregates album counts from album processed events', () => {
    const events: MigrationEvent[] = [
      { type: 'AlbumsDiscovered', count: 5 },
      { type: 'AlbumProcessed', label: 'A1', status: 'saved' },
      { type: 'AlbumProcessed', label: 'A2', status: 'found (not saved)' },
      { type: 'AlbumProcessed', label: 'A3', status: 'not found' },
    ];

    const result = reduceMigrationSummary(events);
    expect(result.albumsTotal).toBe(5);
    expect(result.albumsFound).toBe(2);
    expect(result.notFoundCount).toBe(1);
  });

  it('handles empty events', () => {
    const events: MigrationEvent[] = [];

    const result = reduceMigrationSummary(events);
    expect(result).toEqual({
      tracksFound: 0,
      tracksTotal: 0,
      albumsFound: 0,
      albumsTotal: 0,
      notFoundCount: 0,
    });
  });
});