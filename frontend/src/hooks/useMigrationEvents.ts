import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { resolveWsUrl, WsConnection } from '@/lib/ws';
import type { WsConnectionState } from '@/lib/ws';
import type { MigrationEvent } from '@/types/api';
import type {
  PlaylistProgressItem,
} from '@/features/migrate/usePlaylistProgress';
import type { AlbumProgressItem } from '@/features/migrate/useAlbumProgress';
import type { MigrationSummary } from '@/features/migrate/useMigrationSummary';

export type WsState = WsConnectionState;

export interface MigrationDerivedState {
  events: MigrationEvent[];
  playlists: PlaylistProgressItem[];
  totalPlaylistsDiscovered: number;
  albums: AlbumProgressItem[];
  totalAlbumsDiscovered: number;
  savedCount: number;
  foundCount: number;
  notFoundLabels: string[];
  summary: MigrationSummary;
}

export interface UseMigrationEventsResult extends MigrationDerivedState {
  state: WsState;
  close: () => void;
  retry: () => void;
  retryCount: number;
}

const initialState: MigrationDerivedState = {
  events: [],
  playlists: [],
  totalPlaylistsDiscovered: 0,
  albums: [],
  totalAlbumsDiscovered: 0,
  savedCount: 0,
  foundCount: 0,
  notFoundLabels: [],
  summary: {
    tracksFound: 0,
    tracksTotal: 0,
    albumsFound: 0,
    albumsTotal: 0,
    notFoundCount: 0,
  },
};

// Incremental reducer: each event mutates the derived state in O(playlists)
// (in practice tiny) instead of O(N) over the full event log.
export function migrationReducer(
  state: MigrationDerivedState,
  event: MigrationEvent,
): MigrationDerivedState {
  const events = [...state.events, event];

  switch (event.type) {
    case 'PlaylistsDiscovered':
      return {
        ...state,
        events,
        totalPlaylistsDiscovered: event.count,
        playlists: [],
        summary: {
          ...state.summary,
          tracksTotal: 0,
          tracksFound: 0,
        },
      };

    case 'PlaylistStarted': {
      const idx = state.playlists.findIndex((p) => p.name === event.name);
      let nextPlaylists: PlaylistProgressItem[];
      let trackDelta: number;
      if (idx === -1) {
        nextPlaylists = [
          ...state.playlists,
          {
            name: event.name,
            status: 'in_progress',
            found: 0,
            total: event.trackCount,
          },
        ];
        trackDelta = event.trackCount;
      } else {
        const prev = state.playlists[idx];
        const prevTotal = prev.total;
        nextPlaylists = state.playlists.map((p, i) =>
          i === idx ? { ...p, status: 'in_progress', total: event.trackCount } : p,
        );
        trackDelta = event.trackCount - prevTotal;
      }
      return {
        ...state,
        events,
        playlists: nextPlaylists,
        summary: {
          ...state.summary,
          tracksTotal: state.summary.tracksTotal + trackDelta,
        },
      };
    }

    case 'PlaylistFinished': {
      const idx = state.playlists.findIndex((p) => p.name === event.name);
      const nextPlaylists =
        idx === -1
          ? state.playlists
          : state.playlists.map((p, i) =>
              i === idx
                ? {
                    name: event.name,
                    status: 'completed' as const,
                    found: event.found,
                    total: event.total,
                  }
                : p,
            );
      return {
        ...state,
        events,
        playlists: nextPlaylists,
        notFoundLabels: [...state.notFoundLabels, ...event.notFoundLabels],
        summary: {
          ...state.summary,
          tracksFound: state.summary.tracksFound + event.found,
          notFoundCount: state.summary.notFoundCount + event.notFoundLabels.length,
        },
      };
    }

    case 'AlbumsDiscovered':
      return {
        ...state,
        events,
        albums: [],
        totalAlbumsDiscovered: event.count,
        savedCount: 0,
        foundCount: 0,
        // notFoundLabels deliberately NOT cleared: PlaylistFinished may have
        // already added entries we want to keep visible.
        summary: {
          ...state.summary,
          albumsTotal: event.count,
          albumsFound: 0,
          // matches the legacy reducer behavior: AlbumsDiscovered resets the
          // running notFoundCount that the album loop will re-tally.
          notFoundCount: 0,
        },
      };

    case 'AlbumProcessed': {
      const albums = [...state.albums, { label: event.label, status: event.status }];
      let savedCount = state.savedCount;
      let foundCount = state.foundCount;
      let albumsFound = state.summary.albumsFound;
      let notFoundCount = state.summary.notFoundCount;
      const notFoundLabels = [...state.notFoundLabels];
      if (event.status === 'saved') {
        savedCount += 1;
        albumsFound += 1;
      } else if (event.status === 'found (not saved)') {
        foundCount += 1;
        albumsFound += 1;
      } else if (event.status === 'not found') {
        notFoundCount += 1;
        notFoundLabels.push(event.label);
      }
      return {
        ...state,
        events,
        albums,
        savedCount,
        foundCount,
        notFoundLabels,
        summary: {
          ...state.summary,
          albumsFound,
          notFoundCount,
        },
      };
    }

    case 'PlaylistCreationFailed':
    case 'PlaylistChunkFailed':
    case 'AlbumSaveFailed':
    case 'MigrationFinished':
      return { ...state, events };
  }
}

export function useMigrationEvents(
  jobId: string | null,
): UseMigrationEventsResult {
  const [derived, dispatch] = useReducer(migrationReducer, initialState);
  const [state, setState] = useState<WsState>(jobId ? 'connecting' : 'closed');
  const [retryCount, setRetryCount] = useState(0);
  const connRef = useRef<WsConnection | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const conn = new WsConnection(
      resolveWsUrl(`/migrate/${jobId}/events`),
    );

    conn.onMessage = (raw: unknown) => {
      let parsed: MigrationEvent;
      try {
        parsed = JSON.parse(String(raw)) as MigrationEvent;
      } catch (err) {
        console.warn('useMigrationEvents: malformed WS message', err);
        return;
      }
      dispatch(parsed);
    };

    conn.onStateChange = (newState: WsConnectionState) => {
      setState(newState);
      setRetryCount(conn.getRetryCount());
    };

    connRef.current = conn;
    conn.connect();

    return () => {
      connRef.current = null;
      conn.close();
    };
  }, [jobId]);

  const close = useCallback(() => {
    connRef.current?.close();
  }, []);

  const retry = useCallback(() => {
    const conn = connRef.current;
    if (!conn) return;
    conn.resetRetry();
    setRetryCount(0);
    conn.connect();
  }, []);

  return {
    ...derived,
    state,
    close,
    retry,
    retryCount,
  };
}
