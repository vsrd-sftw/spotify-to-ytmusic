import { useMemo } from 'react';
import type { MigrationEvent } from '@/types/api';

export interface MigrationSummary {
  tracksFound: number;
  tracksTotal: number;
  albumsFound: number;
  albumsTotal: number;
  notFoundCount: number;
}

export function reduceMigrationSummary(events: MigrationEvent[]): MigrationSummary {
  let tracksFound = 0;
  let tracksTotal = 0;
  let albumsTotal = 0;
  let albumsFound = 0;
  let notFoundCount = 0;

  for (const event of events) {
    if (event.type === 'PlaylistsDiscovered') {
      tracksTotal = 0;
      tracksFound = 0;
    } else if (event.type === 'PlaylistStarted') {
      tracksTotal += event.trackCount;
    } else if (event.type === 'PlaylistFinished') {
      tracksFound += event.found;
      notFoundCount += event.notFoundLabels.length;
    } else if (event.type === 'AlbumsDiscovered') {
      albumsTotal = event.count;
      albumsFound = 0;
      notFoundCount = 0;
    } else if (event.type === 'AlbumProcessed') {
      if (event.status === 'saved' || event.status === 'found (not saved)') {
        albumsFound++;
      }
      if (event.status === 'not found') {
        notFoundCount++;
      }
    }
  }

  return { tracksFound, tracksTotal, albumsFound, albumsTotal, notFoundCount };
}

export function useMigrationSummary(events: MigrationEvent[]): MigrationSummary {
  const result = useMemo(() => reduceMigrationSummary(events), [events]);
  return result;
}