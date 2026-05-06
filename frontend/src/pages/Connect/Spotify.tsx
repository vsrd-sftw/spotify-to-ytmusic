import { Button } from '@/components/ui'

export function SpotifyConnect() {
  return (
    <section aria-labelledby="spotify-connect-heading" className="flex flex-col gap-4 p-8">
      <h2 id="spotify-connect-heading" className="text-xl font-semibold text-gray-900">
        Conectar Spotify
      </h2>
      <p className="text-sm text-gray-600">
        Inicia sesión con tu cuenta de Spotify para que podamos leer tus playlists y álbumes
        guardados. Serás redirigido a Spotify para autorizar el acceso.
      </p>
      <div>
        <Button>Conectar con Spotify</Button>
      </div>
    </section>
  )
}
