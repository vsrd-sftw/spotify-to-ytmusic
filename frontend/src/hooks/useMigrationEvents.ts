import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveWsUrl } from '@/lib/ws';
import type { MigrationEvent } from '@/types/api';

export type WsState = 'connecting' | 'open' | 'closed' | 'error';

export interface UseMigrationEventsResult {
  events: MigrationEvent[];
  state: WsState;
  close: () => void;
}

export function useMigrationEvents(
  jobId: string | null,
): UseMigrationEventsResult {
  const [events, setEvents] = useState<MigrationEvent[]>([]);
  const [state, setState] = useState<WsState>(jobId ? 'connecting' : 'closed');
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const socket = new WebSocket(
      resolveWsUrl(`/migrate/${jobId}/events`),
    );
    socketRef.current = socket;

    socket.onopen = () => setState('open');
    socket.onmessage = (ev: MessageEvent) => {
      const parsed = JSON.parse(ev.data) as MigrationEvent;
      setEvents((prev) => [...prev, parsed]);
    };
    socket.onerror = () => setState('error');
    socket.onclose = () => setState('closed');

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [jobId]);

  const close = useCallback(() => {
    socketRef.current?.close();
  }, []);

  return { events, state, close };
}
