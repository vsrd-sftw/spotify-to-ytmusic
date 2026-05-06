import { useHealth } from '@/features/auth/useHealth';
import { useAppSection } from '@/hooks/useAppSection';
import type { AppSection } from '@/hooks/useAppSection';
import { ConnectionStatus } from './ConnectionStatus';

const NAV_ITEMS: { id: AppSection; label: string }[] = [
  { id: 'connect', label: 'Conectar' },
  { id: 'library', label: 'Biblioteca' },
  { id: 'migrate', label: 'Migrar' },
  { id: 'reports', label: 'Reportes' },
];

export function Header() {
  const { spotify, ytmusic } = useHealth();
  const { section, setSection } = useAppSection();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4 gap-4">
      <h1 className="text-xl font-bold text-gray-900 shrink-0">Spotify → YT Music</h1>
      <nav className="flex gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              section === item.id
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <ConnectionStatus spotify={spotify} ytmusic={ytmusic} />
    </header>
  );
}
