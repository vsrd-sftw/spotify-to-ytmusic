import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelection } from '@/features/library';
import { useMigrationSelection, useStartMigration } from '@/features/migrate';
import { usePlaylists } from '@/features/library/usePlaylists';
import { useAlbums } from '@/features/library/useAlbums';
import { useSelectionContext } from '@/contexts/useSelectionContext';
import { useAutoFocusHeading } from '@/hooks/useAutoFocusHeading';
import { setIsMigrating } from '@/hooks/useMigrationState';
import { EventLog } from './EventLog';

export function MigratePage() {
  const navigate = useNavigate();
  const [jobId, setJobId] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const { clearAll } = useSelectionContext();

  useEffect(() => {
    if (!jobId) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [jobId]);

  useEffect(() => {
    setIsMigrating(jobId !== null);
    return () => setIsMigrating(false);
  }, [jobId]);

  const handleNavigate = (to: string) => {
    if (jobId) {
      setConfirmExit(true);
      return;
    }
    navigate(to);
  };

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
          className="text-xl font-semibold text-gray-100 outline-none"
        >
          Migrar
        </h2>
        <p className="text-gray-400">No hay elementos seleccionados.</p>
        <button
          onClick={() => handleNavigate('/library')}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Ir a Biblioteca
        </button>
      </section>
    );
  }

  if (jobId) {
    return (
      <>
        {confirmExit && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 shadow-lg max-w-sm mx-4">
              <p className="text-gray-100 mb-4">
                Hay una migración en progreso. Si sales, se interrumpirá.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmExit(false)}
                  className="px-4 py-2 border border-gray-600 rounded hover:bg-gray-700 text-gray-200"
                >
                  Quedarse
                </button>
                <button
                  onClick={() => {
                    setConfirmExit(false);
                    handleNavigate('/library');
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
        )}
        <section className="p-4 sm:p-6">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mb-4 text-xl font-semibold text-gray-100 outline-none"
          >
            Migración en Progreso
          </h2>
          <EventLog jobId={jobId} />
        </section>
      </>
    );
  }

  return (
    <section className="p-4 sm:p-6 flex flex-col gap-4">
      <h2
        ref={headingRef}
        tabIndex={-1}
          className="text-xl font-semibold text-gray-100 outline-none"
        >
          Confirmar Migración
      </h2>
      <div className="text-gray-300">
        <p>¿Confirmas que quieres migrar?</p>
        <ul className="mt-2 list-disc list-inside">
          <li>Playlists: {migration.playlistCount}</li>
          <li>Álbumes: {migration.albumCount}</li>
          <li>Total: {migration.total}</li>
        </ul>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleNavigate('/library')}
          className="px-4 py-2 border border-gray-600 rounded hover:bg-gray-700"
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
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
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