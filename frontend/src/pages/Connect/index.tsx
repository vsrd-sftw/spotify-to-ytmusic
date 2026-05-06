import { useAutoFocusHeading } from '@/hooks/useAutoFocusHeading';
import { SpotifyConnect } from './Spotify';
import { YTMusicConnect } from './YTMusic';

export function ConnectPage() {
  const headingRef = useAutoFocusHeading<HTMLHeadingElement>();
  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6">
      <h2 ref={headingRef} tabIndex={-1} className="sr-only outline-none">
        Conectar servicios
      </h2>
      <SpotifyConnect />
      <YTMusicConnect />
    </div>
  );
}
