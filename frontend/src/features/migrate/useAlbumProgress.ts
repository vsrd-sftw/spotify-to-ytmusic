import { useMemo } from 'react';
import type { MigrationEvent, AlbumStatus } from '@/types/api';

export interface AlbumProgressItem {
  label: string;
  status: AlbumStatus;
}

export interface UseAlbumProgressResult {
  albums: AlbumProgressItem[];
  totalDiscovered: number;
  savedCount: number;
  foundCount: number;
  notFoundCount: number;
}

export function reduceAlbumEvents(events: MigrationEvent[]): UseAlbumProgressResult {
  const albums: AlbumProgressItem[] = [];
  let totalDiscovered = 0;
  let savedCount = 0;
  let foundCount = 0;
  let notFoundCount = 0;

  for (const event of events) {
    if (event.type === 'AlbumsDiscovered') {
      totalDiscovered = event.count;
      albums.length = 0;
      savedCount = 0;
      foundCount = 0;
      notFoundCount = 0;
    } else if (event.type === 'AlbumProcessed') {
      const item: AlbumProgressItem = {
        label: event.label,
        status: event.status,
      };
      albums.push(item);

      if (event.status === 'saved') {
        savedCount++;
      } else if (event.status === 'found (not saved)') {
        foundCount++;
      } else if (event.status === 'not found') {
        notFoundCount++;
      }
    }
  }

  return { albums, totalDiscovered, savedCount, foundCount, notFoundCount };
}

export function useAlbumProgress(events: MigrationEvent[]): UseAlbumProgressResult {
  const result = useMemo(() => reduceAlbumEvents(events), [events]);
  return result;
}