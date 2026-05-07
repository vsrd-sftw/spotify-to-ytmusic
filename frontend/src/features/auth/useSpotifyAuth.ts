import { useCallback, useState } from 'react';
import { http, HttpError } from '@/lib/http';
import { useToast } from '@/lib/useToast';
import { useInvalidateHealth } from './useHealth';

export type AuthState = 'idle' | 'starting' | 'success' | 'error';

export interface UseSpotifyAuthResult {
  state: AuthState;
  errorMessage: string | null;
  connect: () => void;
}

export function useSpotifyAuth(): UseSpotifyAuthResult {
  const [state, setState] = useState<AuthState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();
  const invalidateHealth = useInvalidateHealth();

  const connect = useCallback(() => {
    setState('starting');
    setErrorMessage(null);

    http
      .post<{ url: string }>('/auth/spotify')
      .then(({ url }) => {
        setState('success');
        invalidateHealth();
        toast.success('Conectado a Spotify. Serás redirigido para autorizar.');
        window.location.assign(url);
      })
      .catch((err: unknown) => {
        setState('error');
        if (err instanceof HttpError) {
          const body = err.body as Record<string, unknown> | null;
          setErrorMessage(
            typeof body?.message === 'string'
              ? body.message
              : `Error al conectar con Spotify (${err.status})`,
          );
        } else {
          setErrorMessage('No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.');
        }
      });
  }, []);

  return { state, errorMessage, connect };
}
