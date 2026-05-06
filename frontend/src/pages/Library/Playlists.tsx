import { Button, EmptyState, List, ListItem, ListItemTrailing, Skeleton } from '@/components/ui';
import { usePlaylists } from '@/features/library/usePlaylists';
import type { SelectionState } from '@/features/library/useSelection';

function PlaylistSkeletons() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} variant="text" height={24} />
      ))}
    </div>
  );
}

export interface PlaylistsProps {
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: () => void;
  selectionState?: SelectionState;
}

export function Playlists({
  selectedIds = new Set(),
  onToggle,
  onToggleAll,
  selectionState = 'none',
}: PlaylistsProps) {
  const { data, isLoading, isError, refetch } = usePlaylists();

  if (isLoading) return <PlaylistSkeletons />;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-red-600">No se pudieron cargar las playlists.</p>
        <Button onClick={() => refetch()}>Reintentar</Button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No tienes playlists"
        description="Conecta Spotify para ver tus playlists aquí."
      />
    );
  }

  return (
    <div>
      {onToggleAll && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50">
          <input
            type="checkbox"
            aria-label="Seleccionar todas las playlists"
            checked={selectionState === 'all'}
            ref={(el) => {
              if (el) el.indeterminate = selectionState === 'some';
            }}
            onChange={onToggleAll}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-xs text-gray-500">Seleccionar todas</span>
        </div>
      )}
      <List selectedIds={[...selectedIds]} onSelect={onToggle}>
        {data.map((playlist) => (
          <ListItem key={playlist.id} id={playlist.id}>
            {onToggle && (
              <input
                type="checkbox"
                aria-label={`Seleccionar ${playlist.name}`}
                checked={selectedIds.has(playlist.id)}
                onChange={() => onToggle(playlist.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <span className="flex-1 text-sm font-medium text-gray-900">{playlist.name}</span>
            <ListItemTrailing>
              <span className="text-xs text-gray-500">{playlist.trackCount} canciones</span>
            </ListItemTrailing>
          </ListItem>
        ))}
      </List>
    </div>
  );
}
