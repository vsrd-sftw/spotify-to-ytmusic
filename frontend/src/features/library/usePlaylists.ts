import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { PlaylistSummary } from '@/types/api';

export function usePlaylists() {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: () => http.get<PlaylistSummary[]>('/playlists'),
  });
}
