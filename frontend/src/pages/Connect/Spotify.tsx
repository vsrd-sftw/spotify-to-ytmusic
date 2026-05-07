import { useCallback, useEffect, useState } from 'react'
import { Button, FieldError, Input, Label } from '@/components/ui'
import { http } from '@/lib/http'
import { useSpotifyAuth } from '@/features/auth/useSpotifyAuth'
import { useSpotifySetup } from '@/features/auth/useSpotifySetup'
import { useHealth, useInvalidateHealth } from '@/features/auth/useHealth'

const REDIRECT_URI = 'http://127.0.0.1:5173/api/auth/spotify/callback'

export function SpotifyConnect() {
  const { state, errorMessage, connect } = useSpotifyAuth()
  const { configured, state: setupState, errorMessage: setupError, save, reset } = useSpotifySetup()
  const { spotify } = useHealth()
  const invalidateHealth = useInvalidateHealth()
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [callbackError] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    return err ? decodeURIComponent(err) : null
  })
  const [showCredentials, setShowCredentials] = useState(false)

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const isConnected = spotify === 'connected'

  const disconnect = useCallback(() => {
    http.delete('/auth/spotify').then(() => invalidateHealth())
  }, [invalidateHealth])

  const handleReset = useCallback(() => {
    reset()
    setShowCredentials(true)
  }, [reset])

  const isShowingCredentials = showCredentials || configured === false

  return (
    <section aria-labelledby="spotify-connect-heading" className="flex flex-col gap-4 p-8">
      <h2 id="spotify-connect-heading" className="text-xl font-semibold text-gray-100">
        Conectar Spotify
      </h2>

      {callbackError && (
        <div className="rounded-md border border-red-700 bg-red-900/30 p-3">
          <p className="text-sm text-red-300">{callbackError}</p>
        </div>
      )}

      {isConnected ? (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm font-medium text-green-700">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs">
              ✓
            </span>
            Conectado a Spotify
          </p>
          <div>
            <Button onClick={disconnect} className="bg-red-600 hover:bg-red-700">
              Desconectar
            </Button>
          </div>
        </div>
      ) : (
        <>
          {isShowingCredentials && (
            <div className="flex flex-col gap-3 rounded-md border border-gray-700 p-4">
              <p className="text-sm text-gray-400">
                Configura tus credenciales de desarrollador de Spotify. Puedes obtenerlas en el{' '}
                <a
                  href="https://developer.spotify.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 underline"
                >
                  Dashboard de Spotify
                </a>
                .
              </p>
              <p className="text-sm text-amber-300">
                Importante: agrega{' '}
                <code className="rounded bg-gray-800 px-1.5 py-0.5 text-xs">{REDIRECT_URI}</code>{' '}
                como Redirect URI en "Edit Settings" de tu app en el Dashboard de Spotify.
              </p>
              <div className="flex flex-col gap-1">
                <Label>Client ID</Label>
                <Input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Tu Spotify Client ID"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Client Secret</Label>
                <Input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Tu Spotify Client Secret"
                />
              </div>
              <div>
                <Button
                  onClick={() => save(clientId, clientSecret)}
                  disabled={!clientId || !clientSecret || setupState === 'saving'}
                  loading={setupState === 'saving'}
                >
                  Guardar credenciales
                </Button>
              </div>
              {setupState === 'error' && setupError && <FieldError>{setupError}</FieldError>}
            </div>
          )}

          {configured === true && !isShowingCredentials && (
            <div>
              <Button
                onClick={handleReset}
                variant="secondary"
                disabled={setupState === 'resetting'}
                loading={setupState === 'resetting'}
              >
                Cambiar credenciales
              </Button>
            </div>
          )}

          <p className="text-sm text-gray-400">
            Inicia sesión con tu cuenta de Spotify para que podamos leer tus playlists y álbumes
            guardados. Serás redirigido a Spotify para autorizar el acceso.
          </p>
          <div className="flex flex-col gap-2">
            <div>
              <Button
                onClick={connect}
                disabled={configured !== true || state === 'starting' || state === 'success'}
                loading={state === 'starting'}
              >
                Conectar con Spotify
              </Button>
            </div>
            {state === 'error' && errorMessage && <FieldError>{errorMessage}</FieldError>}
          </div>
        </>
      )}
    </section>
  )
}
