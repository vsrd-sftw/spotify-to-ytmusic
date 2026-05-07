import { useCallback, useState } from 'react'
import { Button, FieldError, Input, Label } from '@/components/ui'
import { http } from '@/lib/http'
import { useSpotifyAuth } from '@/features/auth/useSpotifyAuth'
import { useSpotifySetup } from '@/features/auth/useSpotifySetup'
import { useHealth, useInvalidateHealth } from '@/features/auth/useHealth'

export function SpotifyConnect() {
  const { state, errorMessage, connect } = useSpotifyAuth()
  const {
    configured,
    state: setupState,
    errorMessage: setupError,
    save,
  } = useSpotifySetup()
  const { spotify } = useHealth()
  const invalidateHealth = useInvalidateHealth()
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')

  const isConnected = spotify === 'connected'

  const disconnect = useCallback(() => {
    http.delete('/auth/spotify').then(() => invalidateHealth());
  }, [invalidateHealth]);

  return (
    <section
      aria-labelledby="spotify-connect-heading"
      className="flex flex-col gap-4 p-8"
    >
      <h2
        id="spotify-connect-heading"
        className="text-xl font-semibold text-gray-900"
      >
        Conectar Spotify
      </h2>

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
          {configured === false && (
            <div className="flex flex-col gap-3 rounded-md border border-gray-200 p-4">
              <p className="text-sm text-gray-600">
                Configura tus credenciales de desarrollador de Spotify. Puedes
                obtenerlas en el{' '}
                <a
                  href="https://developer.spotify.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Dashboard de Spotify
                </a>
                .
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
              {setupState === 'error' && setupError && (
                <FieldError>{setupError}</FieldError>
              )}
            </div>
          )}

          <p className="text-sm text-gray-600">
            Inicia sesión con tu cuenta de Spotify para que podamos leer tus
            playlists y álbumes guardados. Serás redirigido a Spotify para
            autorizar el acceso.
          </p>
          <div className="flex flex-col gap-2">
            <div>
              <Button
                onClick={connect}
                disabled={
                  configured !== true ||
                  state === 'starting' ||
                  state === 'success'
                }
                loading={state === 'starting'}
              >
                Conectar con Spotify
              </Button>
            </div>
            {state === 'error' && errorMessage && (
              <FieldError>{errorMessage}</FieldError>
            )}
          </div>
        </>
      )}
    </section>
  )
}
