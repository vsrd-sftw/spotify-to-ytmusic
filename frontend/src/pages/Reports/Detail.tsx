import { useRef } from 'react';
import { Card, CardBody, EmptyState, Skeleton } from '@/components/ui';
import { useReport } from '@/features/reports/useReport';
import { useDeleteReport } from '@/features/reports/useDeleteReport';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useAutoFocusHeading } from '@/hooks/useAutoFocusHeading';
import type { MigrationReport } from '@/types/api';

interface ReportDetailProps {
  report: MigrationReport;
  onClose: () => void;
  onDownload?: (report: MigrationReport) => void;
}

function SectionSkeleton() {
  return (
    <Card>
      <CardBody>
        <div className="flex flex-col gap-2">
          <Skeleton variant="text" className="w-1/3" />
          <Skeleton variant="text" className="w-2/3" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </CardBody>
    </Card>
  );
}

export function ReportDetail({ report, onClose, onDownload }: ReportDetailProps) {
  const id = report.id ?? '';
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, true);
  const headingRef = useAutoFocusHeading<HTMLHeadingElement>();
  const { data, isLoading, error } = useReport(id);
  const resolved = data ?? report;
  const deleteMutation = useDeleteReport();

  return (
    <div ref={containerRef} className="flex flex-col gap-4" aria-busy={isLoading}>
      <div className="flex items-center justify-between">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold text-gray-100 outline-none"
        >
          {resolved.id ? `Reporte ${resolved.id.slice(0, 8)}` : 'Detalle del reporte'}
        </h2>
        <div className="flex gap-2">
          {onDownload && (
            <button
              type="button"
              onClick={() => onDownload(resolved)}
              className="px-3 py-1.5 text-sm font-medium text-gray-300 border border-gray-600 rounded-md hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              Descargar JSON
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              deleteMutation.mutate(id, {
                onSuccess: () => onClose(),
              });
            }}
            disabled={deleteMutation.isPending}
            className="px-3 py-1.5 text-sm font-medium text-red-400 border border-red-800 rounded-md hover:bg-red-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
          >
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar reporte'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-gray-300 border border-gray-600 rounded-md hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Cerrar
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      )}

      {error && (
        <EmptyState
          title="Error al cargar el detalle"
          description="No se pudo obtener la información completa del reporte."
        />
      )}

      {!isLoading && !error && (
        <div className="flex flex-col gap-4">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-gray-300">
              Playlists ({resolved.playlists.length})
            </h3>
            {resolved.playlists.length === 0 ? (
              <p className="text-sm text-gray-400">No se migraron playlists.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {resolved.playlists.map((pl, idx) => (
                  <Card key={idx}>
                    <CardBody>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-100">{pl.name}</span>
                        <span className="text-sm text-gray-400">
                          {pl.found}/{pl.total} encontradas
                        </span>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-gray-300">
              Álbumes ({resolved.albums.length})
            </h3>
            {resolved.albums.length === 0 ? (
              <p className="text-sm text-gray-400">No se migraron álbumes.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {resolved.albums.map((album, idx) => {
                  const statusColors: Record<string, string> = {
                    saved: 'text-green-700',
                    'found (not saved)': 'text-yellow-700',
                    'not found': 'text-red-700',
                  };
                  return (
                    <Card key={idx}>
                      <CardBody>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-100">{album.label}</span>
                          <span className={`text-sm font-medium ${statusColors[album.status]}`}>
                            {album.status}
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-gray-300">
              No encontrados ({resolved.notFound.length})
            </h3>
            {resolved.notFound.length === 0 ? (
              <p className="text-sm text-gray-400">Todos los items fueron encontrados.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {resolved.notFound.map((item, idx) => (
                  <Card key={idx}>
                    <CardBody>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-gray-100">{item.item}</span>
                        <span className="text-xs text-gray-400">{item.context}</span>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
