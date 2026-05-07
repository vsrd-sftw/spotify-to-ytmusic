import { Card, CardBody } from '@/components/ui/Card';
import type { AlbumProgressItem } from '@/features/migrate/useAlbumProgress';

interface AlbumProgressProps {
  albums: AlbumProgressItem[];
  totalDiscovered: number;
  savedCount: number;
  foundCount: number;
  notFoundCount: number;
}

const STATUS_LABELS: Record<string, string> = {
  saved: 'Guardado',
  'found (not saved)': 'Encontrado',
  'not found': 'No encontrado',
};

const STATUS_STYLES: Record<string, string> = {
  saved: 'bg-green-100 text-green-700',
  'found (not saved)': 'bg-yellow-100 text-yellow-700',
  'not found': 'bg-red-100 text-red-700',
};

function AlbumItem({ album }: { album: AlbumProgressItem }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="truncate text-gray-100">{album.label}</span>
      <span
        className={[
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          STATUS_STYLES[album.status],
        ].join(' ')}
      >
        {STATUS_LABELS[album.status]}
      </span>
    </div>
  );
}

export function AlbumProgress({
  albums,
  totalDiscovered,
  savedCount,
  foundCount,
  notFoundCount,
}: AlbumProgressProps) {
  if (totalDiscovered === 0) {
    return null;
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">
            Álbumes ({albums.length} / {totalDiscovered})
          </h3>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-green-700">{savedCount} guardados</span>
          <span className="text-yellow-700">{foundCount} encontrados</span>
          <span className="text-red-700">{notFoundCount} no encontrados</span>
        </div>
        <div className="divide-y divide-gray-700">
          {albums.map((album, index) => (
            <AlbumItem key={`${album.label}-${index}`} album={album} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}