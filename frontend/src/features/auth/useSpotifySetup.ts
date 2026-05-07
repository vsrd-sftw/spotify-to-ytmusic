import { useCallback, useEffect, useState } from 'react'
import { http, HttpError } from '@/lib/http'

export interface UseSpotifySetupResult {
  configured: boolean | null
  state: 'idle' | 'saving' | 'error'
  errorMessage: string | null
  save: (clientId: string, clientSecret: string) => void
}

export function useSpotifySetup(): UseSpotifySetupResult {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    http
      .get<{ configured: boolean }>('/auth/spotify/setup')
      .then(({ configured: cfg }) => setConfigured(cfg))
      .catch(() => setConfigured(false))
  }, [])

  const save = useCallback(
    (clientId: string, clientSecret: string) => {
      setState('saving')
      setErrorMessage(null)
      http
        .post<{ ok: boolean }>('/auth/spotify/setup', {
          client_id: clientId,
          client_secret: clientSecret,
        })
        .then(() => {
          setState('idle')
          setConfigured(true)
        })
        .catch((err: unknown) => {
          setState('error')
          if (err instanceof HttpError) {
            const body = err.body as Record<string, unknown> | null
            setErrorMessage(
              typeof body?.message === 'string'
                ? body.message
                : `Error al guardar credenciales (${err.status})`,
            )
          } else {
            setErrorMessage('No se pudo guardar. Comprueba tu conexión.')
          }
        })
    },
    [],
  )

  return { configured, state, errorMessage, save }
}
