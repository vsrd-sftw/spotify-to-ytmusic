import { describe, expect, it } from 'vitest';
import { reduceAlbumEvents } from './useAlbumProgress';
import type {
  AlbumsDiscoveredEvent,
  AlbumProcessedEvent,
  MigrationEvent,
} from '@/types/api';

describe('reduceAlbumEvents', () => {
  const makeEvent = (e: MigrationEvent): MigrationEvent => e;

  it('returns empty when no events', () => {
    const result = reduceAlbumEvents([]);
    expect(result.albums).toEqual([]);
    expect(result.totalDiscovered).toBe(0);
    expect(result.savedCount).toBe(0);
    expect(result.foundCount).toBe(0);
    expect(result.notFoundCount).toBe(0);
  });

  it('tracks discovered albums count', () => {
    const events: MigrationEvent[] = [
      makeEvent({ type: 'AlbumsDiscovered', count: 5 }) as AlbumsDiscoveredEvent,
    ];
    const result = reduceAlbumEvents(events);
    expect(result.totalDiscovered).toBe(5);
  });

  it('tracks saved album', () => {
    const events: MigrationEvent[] = [
      makeEvent({ type: 'AlbumsDiscovered', count: 1 }) as AlbumsDiscoveredEvent,
      makeEvent({
        type: 'AlbumProcessed',
        label: 'Album 1',
        status: 'saved',
      }) as AlbumProcessedEvent,
    ];
    const result = reduceAlbumEvents(events);
    expect(result.albums).toHaveLength(1);
    expect(result.albums[0].label).toBe('Album 1');
    expect(result.albums[0].status).toBe('saved');
    expect(result.savedCount).toBe(1);
    expect(result.foundCount).toBe(0);
    expect(result.notFoundCount).toBe(0);
  });

  it('tracks found (not saved) album', () => {
    const events: MigrationEvent[] = [
      makeEvent({ type: 'AlbumsDiscovered', count: 1 }) as AlbumsDiscoveredEvent,
      makeEvent({
        type: 'AlbumProcessed',
        label: 'Album 1',
        status: 'found (not saved)',
      }) as AlbumProcessedEvent,
    ];
    const result = reduceAlbumEvents(events);
    expect(result.albums[0].status).toBe('found (not saved)');
    expect(result.foundCount).toBe(1);
  });

  it('tracks not found album', () => {
    const events: MigrationEvent[] = [
      makeEvent({ type: 'AlbumsDiscovered', count: 1 }) as AlbumsDiscoveredEvent,
      makeEvent({
        type: 'AlbumProcessed',
        label: 'Album 1',
        status: 'not found',
      }) as AlbumProcessedEvent,
    ];
    const result = reduceAlbumEvents(events);
    expect(result.albums[0].status).toBe('not found');
    expect(result.notFoundCount).toBe(1);
  });

  it('tracks multiple albums with correct counts', () => {
    const events: MigrationEvent[] = [
      makeEvent({ type: 'AlbumsDiscovered', count: 3 }) as AlbumsDiscoveredEvent,
      makeEvent({
        type: 'AlbumProcessed',
        label: 'Album A',
        status: 'saved',
      }) as AlbumProcessedEvent,
      makeEvent({
        type: 'AlbumProcessed',
        label: 'Album B',
        status: 'found (not saved)',
      }) as AlbumProcessedEvent,
      makeEvent({
        type: 'AlbumProcessed',
        label: 'Album C',
        status: 'not found',
      }) as AlbumProcessedEvent,
    ];
    const result = reduceAlbumEvents(events);
    expect(result.albums).toHaveLength(3);
    expect(result.savedCount).toBe(1);
    expect(result.foundCount).toBe(1);
    expect(result.notFoundCount).toBe(1);
  });

  it('resets counts when new AlbumsDiscovered event arrives', () => {
    const events: MigrationEvent[] = [
      makeEvent({ type: 'AlbumsDiscovered', count: 2 }) as AlbumsDiscoveredEvent,
      makeEvent({
        type: 'AlbumProcessed',
        label: 'Album A',
        status: 'saved',
      }) as AlbumProcessedEvent,
      makeEvent({ type: 'AlbumsDiscovered', count: 1 }) as AlbumsDiscoveredEvent,
      makeEvent({
        type: 'AlbumProcessed',
        label: 'Album X',
        status: 'not found',
      }) as AlbumProcessedEvent,
    ];
    const result = reduceAlbumEvents(events);
    expect(result.totalDiscovered).toBe(1);
    expect(result.albums).toHaveLength(1);
    expect(result.savedCount).toBe(0);
    expect(result.notFoundCount).toBe(1);
  });
});