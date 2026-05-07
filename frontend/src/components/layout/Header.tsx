import { NavLink } from 'react-router-dom';
import { useHealth } from '@/features/auth/useHealth';
import { ConnectionStatus } from './ConnectionStatus';

const NAV_ITEMS: { to: string; label: string }[] = [
  { to: '/connect', label: 'Conectar' },
  { to: '/library', label: 'Biblioteca' },
  { to: '/migrate', label: 'Migrar' },
  { to: '/reports', label: 'Reportes' },
];

export function Header() {
  const { spotify, ytmusic } = useHealth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-700 bg-gray-900 px-4 gap-2 sm:gap-4">
      <h1 className="text-lg sm:text-xl font-bold text-gray-100 shrink-0">Spotify → YT Music</h1>
      <nav aria-label="Navegación principal" className="flex gap-1 overflow-x-auto scrollbar-none whitespace-nowrap">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0',
                isActive
                  ? 'bg-gray-700 text-gray-100'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <ConnectionStatus spotify={spotify} ytmusic={ytmusic} />
    </header>
  );
}
