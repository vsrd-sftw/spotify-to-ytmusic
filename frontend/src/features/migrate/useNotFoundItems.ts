import { useMemo } from 'react';
import type { MigrationEvent } from '@/types/api';

export interface UseNotFoundItemsResult {
  labels: string[];
}

export function reduceNotFoundEvents(events: MigrationEvent[]): UseNotFoundItemsResult {
  const labels: string[] = [];

  for (const event of events) {
    if (event.type === 'PlaylistFinished') {
      labels.push(...event.notFoundLabels);
    } else if (event.type === 'AlbumProcessed' && event.status === 'not found') {
      labels.push(event.label);
    }
  }

  return { labels };
}

export function useNotFoundItems(events: MigrationEvent[]): UseNotFoundItemsResult {
  const result = useMemo(() => reduceNotFoundEvents(events), [events]);
  return result;
}