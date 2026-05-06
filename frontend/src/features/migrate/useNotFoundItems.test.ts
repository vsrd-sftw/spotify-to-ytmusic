import { describe, expect, it } from 'vitest';
import { reduceNotFoundEvents } from './useNotFoundItems';
import type { MigrationEvent } from '@/types/api';

describe('reduceNotFoundEvents', () => {
  it('accumulates not found labels from PlaylistFinished events', () => {
    const events: MigrationEvent[] = [
      {
        type: 'PlaylistFinished',
        name: 'Playlist 1',
        found: 8,
        total: 10,
        notFoundLabels: ['Song A', 'Song B'],
      },
    ];

    const result = reduceNotFoundEvents(events);
    expect(result.labels).toEqual(['Song A', 'Song B']);
  });

  it('accumulates not found labels from AlbumProcessed with status not found', () => {
    const events: MigrationEvent[] = [
      {
        type: 'AlbumProcessed',
        label: 'Album 1',
        status: 'not found',
      },
    ];

    const result = reduceNotFoundEvents(events);
    expect(result.labels).toEqual(['Album 1']);
  });

  it('combines labels from both playlist and album events', () => {
    const events: MigrationEvent[] = [
      {
        type: 'PlaylistFinished',
        name: 'Playlist 1',
        found: 5,
        total: 6,
        notFoundLabels: ['Missing Song'],
      },
      {
        type: 'AlbumProcessed',
        label: 'Missing Album',
        status: 'not found',
      },
      {
        type: 'AlbumProcessed',
        label: 'Found Album',
        status: 'saved',
      },
    ];

    const result = reduceNotFoundEvents(events);
    expect(result.labels).toEqual(['Missing Song', 'Missing Album']);
  });

  it('handles empty events', () => {
    const events: MigrationEvent[] = [];

    const result = reduceNotFoundEvents(events);
    expect(result.labels).toEqual([]);
  });

  it('handles events with no not found items', () => {
    const events: MigrationEvent[] = [
      {
        type: 'PlaylistFinished',
        name: 'Playlist 1',
        found: 10,
        total: 10,
        notFoundLabels: [],
      },
      {
        type: 'AlbumProcessed',
        label: 'Album 1',
        status: 'saved',
      },
    ];

    const result = reduceNotFoundEvents(events);
    expect(result.labels).toEqual([]);
  });
});