import { useCallback, useState } from 'react';
import { http, HttpError } from '@/lib/http';
import { useToast } from '@/lib/useToast';
import { useInvalidateHealth } from './useHealth';

export type AuthState = 'idle' | 'submitting' | 'success' | 'error';

export interface UseYTMusicAuthResult {
  state: AuthState;
  errorMessage: string | null;
  connect: (headers: string) => void;
}

function isValidHeaders(headers: string): boolean {
  const lower = headers.toLowerCase();
  return lower.includes('cookie:') && lower.includes('user-agent:');
}

export function useYTMusicAuth(): UseYTMusicAuthResult {
  const [state, setState] = useState<AuthState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();
  const invalidateHealth = useInvalidateHealth();

  const connect = useCallback(
    (headers: string) => {
      if (!headers.trim()) {
        setErrorMessage('Pega los headers del navegador antes de continuar.');
        return;
      }

      setState('submitting');
      setErrorMessage(null);

      http
        .post('/auth/ytmusic', { headers })
        .then(() => {
          setState('success');
          invalidateHealth();
          toast.success('YouTube Music conectado');
        })
        .catch((err: unknown) => {
          setState('error');
          if (err instanceof HttpError) {
            const body = err.body as Record<string, unknown> | null;
            setErrorMessage(
              typeof body?.message === 'string'
                ? body.message
                : `Error al conectar con YouTube Music (${err.status})`,
            );
          } else {
            setErrorMessage('No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.');
          }
        });
    },
    [toast],
  );

  return { state, errorMessage, connect };
}
