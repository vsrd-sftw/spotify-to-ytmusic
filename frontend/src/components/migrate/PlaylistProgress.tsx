import { Card, CardBody } from '@/components/ui/Card';
import type { PlaylistProgressItem } from '@/features/migrate/usePlaylistProgress';

interface PlaylistProgressProps {
  playlists: PlaylistProgressItem[];
  totalDiscovered: number;
}

const STATUS_LABELS = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
};

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

function PlaylistCard({ playlist }: { playlist: PlaylistProgressItem }) {
  const progressPercent =
    playlist.total > 0 ? (playlist.found / playlist.total) * 100 : 0;
  const isInProgress = playlist.status === 'in_progress';

  return (
    <Card className={isInProgress ? 'border-blue-300 ring-2 ring-blue-100' : ''}>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 truncate">{playlist.name}</span>
          <span
            className={[
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              STATUS_STYLES[playlist.status],
            ].join(' ')}
          >
            {STATUS_LABELS[playlist.status]}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            {playlist.found} / {playlist.total} encontradas
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
      </CardBody>
    </Card>
  );
}

export function PlaylistProgress({ playlists, totalDiscovered }: PlaylistProgressProps) {
  if (totalDiscovered === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">
        Playlists ({playlists.length} / {totalDiscovered})
      </h3>
      <div className="space-y-2">
        {playlists.map((playlist) => (
          <PlaylistCard key={playlist.name} playlist={playlist} />
        ))}
      </div>
    </div>
  );
}