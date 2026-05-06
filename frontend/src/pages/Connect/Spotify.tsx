import { Button, FieldError } from '@/components/ui';
import { useSpotifyAuth } from '@/features/auth/useSpotifyAuth';

export function SpotifyConnect() {
  const { state, errorMessage, connect } = useSpotifyAuth();

  return (
    <section aria-labelledby="spotify-connect-heading" className="flex flex-col gap-4 p-8">
      <h2 id="spotify-connect-heading" className="text-xl font-semibold text-gray-900">
        Conectar Spotify
      </h2>
      <p className="text-sm text-gray-600">
        Inicia sesión con tu cuenta de Spotify para que podamos leer tus playlists y álbumes
        guardados. Serás redirigido a Spotify para autorizar el acceso.
      </p>
      <div className="flex flex-col gap-2">
        <div>
          <Button
            onClick={connect}
            disabled={state === 'starting' || state === 'success'}
            loading={state === 'starting'}
          >
            Conectar con Spotify
          </Button>
        </div>
        {state === 'error' && errorMessage && (
          <FieldError>{errorMessage}</FieldError>
        )}
      </div>
    </section>
  );
}
