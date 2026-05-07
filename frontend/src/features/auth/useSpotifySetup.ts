import { useCallback, useEffect, useState } from 'react'
import { http, HttpError } from '@/lib/http'

export interface UseSpotifySetupResult {
  configured: boolean | null
  state: 'idle' | 'saving' | 'resetting' | 'error'
  errorMessage: string | null
  save: (clientId: string, clientSecret: string) => void
  reset: () => void
}

export function useSpotifySetup(): UseSpotifySetupResult {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [state, setState] = useState<'idle' | 'saving' | 'resetting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    http
      .get<{ configured: boolean }>('/auth/spotify/setup')
      .then(({ configured: cfg }) => setConfigured(cfg))
      .catch(() => setConfigured(false))
  }, [])

  const save = useCallback((clientId: string, clientSecret: string) => {
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
        console.error('useSpotifySetup save error:', err)
        if (err instanceof HttpError) {
          const body = err.body as Record<string, unknown> | null
          console.error('useSpotifySetup save HttpError:', { status: err.status, body })
          setErrorMessage(
            typeof body?.message === 'string'
              ? body.message
              : `Error al guardar credenciales (${err.status})`,
          )
        } else {
          const msg = err instanceof Error ? err.message : String(err)
          setErrorMessage(`Error de red: ${msg}`)
        }
      })
  }, [])

  const reset = useCallback(() => {
    setState('resetting')
    setErrorMessage(null)
    http
      .delete<{ ok: boolean }>('/auth/spotify/setup')
      .then(() => {
        setState('idle')
        setConfigured(false)
      })
      .catch((err: unknown) => {
        setState('error')
        if (err instanceof HttpError) {
          const body = err.body as Record<string, unknown> | null
          setErrorMessage(
            typeof body?.message === 'string'
              ? body.message
              : `Error al restablecer credenciales (${err.status})`,
          )
        } else {
          setErrorMessage('No se pudo restablecer. Comprueba tu conexión.')
        }
      })
  }, [])

  return { configured, state, errorMessage, save, reset }
}
