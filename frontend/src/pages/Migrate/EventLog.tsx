import { useEffect, useRef } from 'react';
import { useMigrationEvents } from '@/hooks/useMigrationEvents';
import { useAppSection } from '@/hooks/useAppSection';
import { useNotFoundItems } from '@/features/migrate/useNotFoundItems';
import { useMigrationSummary } from '@/features/migrate/useMigrationSummary';
import { NotFound } from '@/components/Migrate/NotFound';
import { CompletionSummary } from '@/components/Migrate/CompletionSummary';
import type { WsState } from '@/hooks/useMigrationEvents';
import type { MigrationEvent } from '@/types/api';

interface EventLogProps {
  jobId: string;
}

const stateLabels: Record<WsState, string> = {
  connecting: 'Conectando...',
  open: 'En vivo',
  closed: 'Cerrado',
  error: 'Error de conexión',
};

const stateColors: Record<WsState, string> = {
  connecting: 'bg-yellow-100 text-yellow-800',
  open: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
  error: 'bg-red-100 text-red-800',
};

function formatEvent(event: MigrationEvent): string {
  switch (event.type) {
    case 'PlaylistsDiscovered':
      return `Descubiertas ${event.count} playlists`;
    case 'PlaylistStarted':
      return `Iniciando "${event.name}" (${event.trackCount} pistas)`;
    case 'PlaylistFinished': {
      const notFound = event.notFoundLabels.length > 0
        ? `, ${event.notFoundLabels.length} no encontradas`
        : '';
      return `Finalizada "${event.name}": ${event.found}/${event.total} encontradas${notFound}`;
    }
    case 'AlbumsDiscovered':
      return `Descubiertos ${event.count} álbumes`;
    case 'AlbumProcessed': {
      const statusLabel: Record<string, string> = {
        saved: 'ya guardado',
        'found (not saved)': 'encontrado (no guardado)',
        'not found': 'no encontrado',
      };
      return `"${event.label}": ${statusLabel[event.status]}`;
    }
  }
}

export function EventLog({ jobId }: EventLogProps) {
  const { events, state } = useMigrationEvents(jobId);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setSection } = useAppSection();
  const { labels } = useNotFoundItems(events);
  const summary = useMigrationSummary(events);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events]);

  const isClosedCleanly = state === 'closed' && events.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Estado:</span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${stateColors[state]}`}>
          {stateLabels[state]}
        </span>
      </div>
      <div
        ref={containerRef}
        className="h-64 overflow-y-auto bg-gray-50 border rounded-md p-3 font-mono text-sm"
      >
        {events.length === 0 ? (
          <span className="text-gray-400">Esperando eventos...</span>
        ) : (
          events.map((event, idx) => (
            <div key={idx} className="py-0.5 text-gray-700">
              {formatEvent(event)}
            </div>
          ))
        )}
      </div>
      {isClosedCleanly ? (
        <CompletionSummary
          tracksFound={summary.tracksFound}
          tracksTotal={summary.tracksTotal}
          albumsFound={summary.albumsFound}
          albumsTotal={summary.albumsTotal}
          notFoundCount={summary.notFoundCount}
          onViewReport={() => setSection('reports')}
        />
      ) : (
        <NotFound labels={labels} />
      )}
    </div>
  );
}