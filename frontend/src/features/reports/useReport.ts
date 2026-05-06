import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { MigrationReport } from '@/types/api';

export function useReport(id: string) {
  return useQuery({
    queryKey: ['reports', id],
    queryFn: () => http.get<MigrationReport>(`/reports/${id}`),
    enabled: !!id,
  });
}
