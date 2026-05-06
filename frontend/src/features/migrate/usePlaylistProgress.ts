import { useMemo } from 'react';
import type { MigrationEvent } from '@/types/api';

export type PlaylistProgressStatus = 'pending' | 'in_progress' | 'completed';

export interface PlaylistProgressItem {
  name: string;
  status: PlaylistProgressStatus;
  found: number;
  total: number;
}

export interface UsePlaylistProgressResult {
  playlists: PlaylistProgressItem[];
  totalDiscovered: number;
}

export function reducePlaylistEvents(
  events: MigrationEvent[],
): UsePlaylistProgressResult {
  const playlists: PlaylistProgressItem[] = [];
  let totalDiscovered = 0;

  for (const event of events) {
    if (event.type === 'PlaylistsDiscovered') {
      totalDiscovered = event.count;
      playlists.length = 0;
    } else if (event.type === 'PlaylistStarted') {
      const index = playlists.findIndex((p) => p.name === event.name);
      if (index === -1) {
        playlists.push({
          name: event.name,
          status: 'in_progress',
          found: 0,
          total: event.trackCount,
        });
      } else {
        playlists[index].status = 'in_progress';
        playlists[index].total = event.trackCount;
      }
    } else if (event.type === 'PlaylistFinished') {
      const index = playlists.findIndex((p) => p.name === event.name);
      if (index !== -1) {
        playlists[index] = {
          name: event.name,
          status: 'completed',
          found: event.found,
          total: event.total,
        };
      }
    }
  }

  return { playlists, totalDiscovered };
}

export function usePlaylistProgress(events: MigrationEvent[]): UsePlaylistProgressResult {
  const result = useMemo(() => reducePlaylistEvents(events), [events]);
  return result;
}