import { useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http';

interface OkResponse {
  ok: boolean;
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => http.delete<OkResponse>(`/reports/${id}`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['reports', id] });
    },
  });
}
