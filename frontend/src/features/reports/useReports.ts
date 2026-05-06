import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { MigrationReport } from '@/types/api';

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: () => http.get<MigrationReport[]>('/reports'),
  });
}
