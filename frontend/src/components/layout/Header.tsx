import { useHealth } from '@/features/auth/useHealth';
import { ConnectionStatus } from './ConnectionStatus';

export function Header() {
  const { spotify, ytmusic } = useHealth();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4">
      <h1 className="text-xl font-bold text-gray-900">Spotify → YT Music</h1>
      <ConnectionStatus spotify={spotify} ytmusic={ytmusic} />
    </header>
  );
}
