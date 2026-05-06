import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { HealthResponse } from '@/types/api';

export type ConnectionState = 'unknown' | 'connected' | 'disconnected';

export interface HealthStatus {
  spotify: ConnectionState;
  ytmusic: ConnectionState;
}

function toConnectionState(value: boolean | undefined): ConnectionState {
  if (value === true) return 'connected';
  if (value === false) return 'disconnected';
  return 'unknown';
}

export function useHealth(): HealthStatus {
  const { data, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => http.get<HealthResponse>('/health'),
    staleTime: 10_000,
    retry: false,
  });

  if (isLoading || !data) {
    return { spotify: 'unknown', ytmusic: 'unknown' };
  }

  return {
    spotify: toConnectionState(data.spotify),
    ytmusic: toConnectionState(data.ytmusic),
  };
}
