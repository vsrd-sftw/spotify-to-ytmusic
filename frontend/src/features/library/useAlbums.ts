import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { Album } from '@/types/api';

export function useAlbums() {
  return useQuery({
    queryKey: ['albums'],
    queryFn: () => http.get<Album[]>('/albums'),
  });
}
