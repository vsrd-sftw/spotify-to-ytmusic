import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelection } from '@/features/library';
import { useMigrationSelection, useStartMigration } from '@/features/migrate';
import { usePlaylists } from '@/features/library/usePlaylists';
import { useAlbums } from '@/features/library/useAlbums';
import { useSelectionContext } from '@/contexts/useSelectionContext';
import { useAutoFocusHeading } from '@/hooks/useAutoFocusHeading';
import { EventLog } from './EventLog';

export function MigratePage() {
  const navigate = useNavigate();
  const [jobId, setJobId] = useState<string | null>(null);
  const { clearAll } = useSelectionContext();

  const { data: playlists = [] } = usePlaylists();
  const { data: albums = [] } = useAlbums();

  const playlistSelection = useSelection(playlists, (p) => p.id, 'playlists');
  const albumSelection = useSelection(albums, (a) => a.spotifyId, 'albums');

  const migration = useMigrationSelection(playlistSelection.selectedIds, albumSelection.selectedIds);

  const startMigration = useStartMigration({
    onSuccess: (newJobId) => {
      setJobId(newJobId);
      clearAll();
    },
  });

  // Drives focus to the active heading on mount and whenever the page
  // switches between empty / confirm / progress states.
  const branch = jobId ? 'progress' : migration.isEmpty ? 'empty' : 'confirm';
  const headingRef = useAutoFocusHeading<HTMLHeadingElement>([branch]);

  if (migration.isEmpty && !jobId) {
    return (
      <section className="p-4 sm:p-6 flex flex-col items-center justify-center h-64 gap-4">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-semibold text-gray-900 outline-none"
        >
          Migrar
        </h2>
        <p className="text-gray-600">No hay elementos seleccionados.</p>
        <button
          onClick={() => navigate('/library')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Ir a Biblioteca
        </button>
      </section>
    );
  }

  if (jobId) {
    return (
      <section className="p-4 sm:p-6">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mb-4 text-xl font-semibold text-gray-900 outline-none"
        >
          Migración en Progreso
        </h2>
        <EventLog jobId={jobId} />
      </section>
    );
  }

  return (
    <section className="p-4 sm:p-6 flex flex-col gap-4">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-semibold text-gray-900 outline-none"
      >
        Confirmar Migración
      </h2>
      <div className="text-gray-700">
        <p>¿Confirmas que quieres migrar?</p>
        <ul className="mt-2 list-disc list-inside">
          <li>Playlists: {migration.playlistCount}</li>
          <li>Álbumes: {migration.albumCount}</li>
          <li>Total: {migration.total}</li>
        </ul>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => navigate('/library')}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={() =>
            startMigration.mutate({
              playlistIds: Array.from(migration.selectedPlaylistIds),
              albumIds: Array.from(migration.selectedAlbumIds),
            })
          }
          disabled={startMigration.isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {startMigration.isLoading ? 'Iniciando...' : 'Iniciar Migración'}
        </button>
      </div>
      {startMigration.error && (
        <div className="text-red-600">
          Error al iniciar migración.{' '}
          <button
            onClick={() => startMigration.mutate({
              playlistIds: Array.from(migration.selectedPlaylistIds),
              albumIds: Array.from(migration.selectedAlbumIds),
            })}
            className="underline"
          >
            Reintentar
          </button>
        </div>
      )}
    </section>
  );
}