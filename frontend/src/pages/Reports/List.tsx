import { useReports } from '@/features/reports/useReports';
import { useDeleteReport } from '@/features/reports/useDeleteReport';
import { Card, CardBody, EmptyState, Skeleton } from '@/components/ui';
import type { MigrationReport } from '@/types/api';

interface ReportsListProps {
  onSelectReport?: (report: MigrationReport) => void;
}

function ReportItem({
  report,
  onClick,
  onDelete,
  isDeleting,
}: {
  report: MigrationReport;
  onClick: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const playlistCount = report.playlists.length;
  const albumCount = report.albums.length;
  const missCount = report.notFound.length;

  return (
    <div className="flex items-center gap-2 group">
      <button
        type="button"
        className="flex-1 w-full text-left"
        onClick={onClick}
      >
        <Card className="hover:border-blue-300 transition-colors cursor-pointer">
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-100">
                  {report.id ? `Reporte ${report.id.slice(0, 8)}` : 'Reporte sin ID'}
                </span>
                <div className="flex gap-3 text-xs text-gray-400">
                  <span>{playlistCount} playlist{playlistCount !== 1 ? 's' : ''}</span>
                  <span>{albumCount} álbum{albumCount !== 1 ? 'es' : ''}</span>
                  {missCount > 0 && (
                    <span className="text-red-600">{missCount} no encontrad{missCount !== 1 ? 'as' : 'a'}</span>
                  )}
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </CardBody>
        </Card>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={isDeleting}
        className="px-2 py-1 text-xs font-medium text-red-400 border border-red-800 rounded-md hover:bg-red-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Eliminar reporte ${report.id ?? ''}`}
      >
        {isDeleting ? '...' : 'Eliminar'}
      </button>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardBody>
            <div className="flex flex-col gap-2">
              <Skeleton variant="text" className="w-2/3" />
              <Skeleton variant="text" className="w-1/2" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function ReportsList({ onSelectReport }: ReportsListProps) {
  const { data, isLoading, error } = useReports();
  const deleteMutation = useDeleteReport();

  if (isLoading) {
    return (
      <div aria-busy="true" role="status">
        <span className="sr-only">Cargando reportes...</span>
        <SkeletonList />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Error al cargar reportes"
        description="No se pudieron obtener los reportes de migración."
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="Sin reportes"
        description="Aún no se ha completado ninguna migración."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {data.map((report, idx) => (
        <ReportItem
          key={report.id ?? `report-${idx}`}
          report={report}
          onClick={() => onSelectReport?.(report)}
          onDelete={() => deleteMutation.mutate(report.id ?? '')}
          isDeleting={deleteMutation.isPending && deleteMutation.variables === report.id}
        />
      ))}
    </div>
  );
}
