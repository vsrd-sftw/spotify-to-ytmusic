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

function extractErrorMessage(err: HttpError): string | null {
  const body = err.body as Record<string, unknown> | null;
  if (typeof body?.message === 'string') return body.message;
  if (typeof body?.detail === 'string') return body.detail;
  if (typeof body === 'string') return body;
  return null;
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
        .post('/auth/ytmusic', { headers }, { timeoutMs: 30_000 })
        .then(() => {
          setState('success');
          invalidateHealth();
          toast.success('YouTube Music conectado');
        })
        .catch((err: unknown) => {
          setState('error');
          if (err instanceof HttpError) {
            const detail = extractErrorMessage(err);
            setErrorMessage(detail ?? `Error al conectar con YouTube Music (${err.status})`);
          } else {
            setErrorMessage('No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.');
          }
        });
    },
    [toast, invalidateHealth],
  );

  return { state, errorMessage, connect };
}
