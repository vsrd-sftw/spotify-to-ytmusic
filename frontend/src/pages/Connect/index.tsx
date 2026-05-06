import { SpotifyConnect } from './Spotify';
import { YTMusicConnect } from './YTMusic';

export function ConnectPage() {
  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6">
      <SpotifyConnect />
      <YTMusicConnect />
    </div>
  );
}
