import { useNavigate, useParams } from 'react-router-dom';
import { ReportsList } from './List';
import { ReportDetail } from './Detail';
import { useReport } from '@/features/reports/useReport';
import { useAutoFocusHeading } from '@/hooks/useAutoFocusHeading';
import { EmptyState, Skeleton, Card, CardBody } from '@/components/ui';
import { downloadJson } from '@/lib/download';
import type { MigrationReport } from '@/types/api';

export function ReportsListPage() {
  const navigate = useNavigate();
  const headingRef = useAutoFocusHeading<HTMLHeadingElement>();
  return (
    <section className="p-4 sm:p-6 flex flex-col gap-4">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-semibold text-gray-900 outline-none"
      >
        Reportes
      </h2>
      <ReportsList
        onSelectReport={(report) => {
          if (report.id) {
            navigate(`/reports/${report.id}`);
          }
        }}
      />
    </section>
  );
}

export function ReportDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useReport(id);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 flex flex-col gap-4" aria-busy="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardBody>
              <div className="flex flex-col gap-2">
                <Skeleton variant="text" className="w-1/3" />
                <Skeleton variant="text" className="w-2/3" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          title="Reporte no encontrado"
          description="No se pudo cargar el reporte solicitado."
        />
      </div>
    );
  }

  // useReport already returns the full MigrationReport when found.
  // ReportDetail re-fetches by id internally, so we pass the resolved report.
  const report: MigrationReport = data;

  return (
    <div className="p-4 sm:p-6">
      <ReportDetail
        report={report}
        onClose={() => navigate('/reports')}
        onDownload={(r) => {
          const filename = r.id ? `report-${r.id.slice(0, 8)}` : 'report';
          downloadJson(filename, r);
        }}
      />
    </div>
  );
}
