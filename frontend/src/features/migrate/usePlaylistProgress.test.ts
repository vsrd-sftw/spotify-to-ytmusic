import { describe, expect, it } from 'vitest';
import { reducePlaylistEvents } from './usePlaylistProgress';
import type {
  PlaylistsDiscoveredEvent,
  PlaylistStartedEvent,
  PlaylistFinishedEvent,
  MigrationEvent,
} from '@/types/api';

describe('reducePlaylistEvents', () => {
  const makeEvent = (e: MigrationEvent): MigrationEvent => e;

  it('returns empty when no events', () => {
    const result = reducePlaylistEvents([]);
    expect(result.playlists).toEqual([]);
    expect(result.totalDiscovered).toBe(0);
  });

  it('tracks discovered playlists count', () => {
    const events: MigrationEvent[] = [
      makeEvent({ type: 'PlaylistsDiscovered', count: 3 }) as PlaylistsDiscoveredEvent,
    ];
    const result = reducePlaylistEvents(events);
    expect(result.totalDiscovered).toBe(3);
  });

  it('tracks in-progress playlist', () => {
    const events: MigrationEvent[] = [
      makeEvent({ type: 'PlaylistsDiscovered', count: 1 }) as PlaylistsDiscoveredEvent,
      makeEvent({
        type: 'PlaylistStarted',
        name: 'My Playlist',
        trackCount: 10,
      }) as PlaylistStartedEvent,
    ];
    const result = reducePlaylistEvents(events);
    expect(result.playlists).toHaveLength(1);
    expect(result.playlists[0].name).toBe('My Playlist');
    expect(result.playlists[0].status).toBe('in_progress');
    expect(result.playlists[0].total).toBe(10);
    expect(result.playlists[0].found).toBe(0);
  });

  it('tracks completed playlist with found/total', () => {
    const events: MigrationEvent[] = [
      makeEvent({ type: 'PlaylistsDiscovered', count: 1 }) as PlaylistsDiscoveredEvent,
      makeEvent({
        type: 'PlaylistStarted',
        name: 'My Playlist',
        trackCount: 10,
      }) as PlaylistStartedEvent,
      makeEvent({
        type: 'PlaylistFinished',
        name: 'My Playlist',
        found: 8,
        total: 10,
        notFoundLabels: ['Track A', 'Track B'],
      }) as PlaylistFinishedEvent,
    ];
    const result = reducePlaylistEvents(events);
    expect(result.playlists).toHaveLength(1);
    expect(result.playlists[0].status).toBe('completed');
    expect(result.playlists[0].found).toBe(8);
    expect(result.playlists[0].total).toBe(10);
  });

  it('tracks multiple playlists independently', () => {
    const events: MigrationEvent[] = [
      makeEvent({ type: 'PlaylistsDiscovered', count: 2 }) as PlaylistsDiscoveredEvent,
      makeEvent({
        type: 'PlaylistStarted',
        name: 'Playlist A',
        trackCount: 5,
      }) as PlaylistStartedEvent,
      makeEvent({
        type: 'PlaylistStarted',
        name: 'Playlist B',
        trackCount: 3,
      }) as PlaylistStartedEvent,
      makeEvent({
        type: 'PlaylistFinished',
        name: 'Playlist A',
        found: 5,
        total: 5,
        notFoundLabels: [],
      }) as PlaylistFinishedEvent,
    ];
    const result = reducePlaylistEvents(events);
    expect(result.playlists).toHaveLength(2);
    const playlistA = result.playlists.find((p) => p.name === 'Playlist A');
    const playlistB = result.playlists.find((p) => p.name === 'Playlist B');
    expect(playlistA?.status).toBe('completed');
    expect(playlistB?.status).toBe('in_progress');
  });

  it('updates playlist when started again after finished', () => {
    const events: MigrationEvent[] = [
      makeEvent({ type: 'PlaylistsDiscovered', count: 1 }) as PlaylistsDiscoveredEvent,
      makeEvent({
        type: 'PlaylistStarted',
        name: 'Playlist A',
        trackCount: 5,
      }) as PlaylistStartedEvent,
      makeEvent({
        type: 'PlaylistFinished',
        name: 'Playlist A',
        found: 3,
        total: 5,
        notFoundLabels: [],
      }) as PlaylistFinishedEvent,
      makeEvent({
        type: 'PlaylistStarted',
        name: 'Playlist A',
        trackCount: 10,
      }) as PlaylistStartedEvent,
    ];
    const result = reducePlaylistEvents(events);
    expect(result.playlists).toHaveLength(1);
    expect(result.playlists[0].status).toBe('in_progress');
    expect(result.playlists[0].total).toBe(10);
  });
});