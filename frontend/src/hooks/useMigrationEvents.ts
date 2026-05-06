import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveWsUrl, WsConnection, WsConnectionState } from '@/lib/ws';
import type { MigrationEvent } from '@/types/api';

export type WsState = WsConnectionState;

export interface UseMigrationEventsResult {
  events: MigrationEvent[];
  state: WsState;
  close: () => void;
  retry: () => void;
  retryCount: number;
}

export function useMigrationEvents(
  jobId: string | null,
): UseMigrationEventsResult {
  const [events, setEvents] = useState<MigrationEvent[]>([]);
  const [state, setState] = useState<WsState>(jobId ? 'connecting' : 'closed');
  const [retryCount, setRetryCount] = useState(0);
  const connRef = useRef<WsConnection | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const conn = new WsConnection(
      resolveWsUrl(`/migrate/${jobId}/events`),
    );

    conn.onMessage = (raw: unknown) => {
      const parsed = JSON.parse(String(raw)) as MigrationEvent;
      setEvents((prev) => [...prev, parsed]);
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

  return { events, state, close, retry, retryCount };
}
