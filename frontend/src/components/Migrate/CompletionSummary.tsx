import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface CompletionSummaryProps {
  tracksFound: number;
  tracksTotal: number;
  albumsFound: number;
  albumsTotal: number;
  notFoundCount: number;
  onViewReport: () => void;
}

export function CompletionSummary({
  tracksFound,
  tracksTotal,
  albumsFound,
  albumsTotal,
  notFoundCount,
  onViewReport,
}: CompletionSummaryProps) {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardBody className="p-4 space-y-3">
        <h3 className="text-lg font-semibold text-green-800">
          Migration Completada
        </h3>
        <div className="space-y-1 text-sm text-gray-700">
          <p>
            Pistas: {tracksFound} / {tracksTotal}
          </p>
          <p>
            Álbumes: {albumsFound} / {albumsTotal}
          </p>
          {notFoundCount > 0 && (
            <p className="text-red-600">No encontrados: {notFoundCount}</p>
          )}
        </div>
        <Button onClick={onViewReport} className="w-full">
          Ver report
        </Button>
      </CardBody>
    </Card>
  );
}