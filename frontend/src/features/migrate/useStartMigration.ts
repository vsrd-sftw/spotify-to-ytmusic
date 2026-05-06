import { useMutation } from '@tanstack/react-query';
import { http } from '@/lib/http';

export interface StartMigrationRequest {
  playlistIds: string[];
  albumIds: string[];
}

export interface StartMigrationResponse {
  jobId: string;
}

export interface UseStartMigrationOptions {
  onSuccess?: (jobId: string) => void;
}

export function useStartMigration(options?: UseStartMigrationOptions) {
  const mutation = useMutation({
    mutationFn: async (request: StartMigrationRequest) => {
      const response = await http.post<StartMigrationResponse>(
        '/migrate',
        request,
      );
      return response;
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data.jobId);
    },
  });

  return {
    jobId: mutation.data?.jobId,
    isLoading: mutation.isPending,
    error: mutation.error,
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
  };
}