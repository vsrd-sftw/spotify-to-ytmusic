import type { ConnectionState } from '@/features/auth/useHealth';

interface BadgeProps {
  label: string;
  state: ConnectionState;
}

const stateStyles: Record<ConnectionState, string> = {
  unknown: 'bg-gray-100 text-gray-500',
  connected: 'bg-green-100 text-green-700',
  disconnected: 'bg-red-100 text-red-700',
};

const stateLabel: Record<ConnectionState, string> = {
  unknown: 'desconocido',
  connected: 'conectado',
  disconnected: 'desconectado',
};

// Glyphs convey the state in addition to color (WCAG 1.4.1).
const stateIcon: Record<ConnectionState, string> = {
  unknown: '○',
  connected: '●',
  disconnected: '✕',
};

function ConnectionBadge({ label, state }: BadgeProps) {
  return (
    <span
      className={['inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', stateStyles[state]].join(' ')}
      aria-label={`Estado de conexión: ${label} ${stateLabel[state]}`}
    >
      <span aria-hidden="true" data-testid={`connection-icon-${state}`}>
        {stateIcon[state]}
      </span>
      {label}
    </span>
  );
}

export interface ConnectionStatusProps {
  spotify: ConnectionState;
  ytmusic: ConnectionState;
}

export function ConnectionStatus({ spotify, ytmusic }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <ConnectionBadge label="Spotify" state={spotify} />
      <ConnectionBadge label="YT Music" state={ytmusic} />
    </div>
  );
}
