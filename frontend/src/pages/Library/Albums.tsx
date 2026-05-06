import { Button, EmptyState, List, ListItem, ListItemTrailing, Skeleton } from '@/components/ui';
import { useAlbums } from '@/features/library/useAlbums';

function AlbumSkeletons() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} variant="text" height={24} />
      ))}
    </div>
  );
}

export interface AlbumsProps {
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: () => void;
  selectionState?: 'none' | 'some' | 'all';
}

export function Albums({ selectedIds = new Set(), onToggle, onToggleAll, selectionState = 'none' }: AlbumsProps) {
  const { data, isLoading, isError, refetch } = useAlbums();

  if (isLoading) return <AlbumSkeletons />;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-red-600">No se pudieron cargar los álbumes.</p>
        <Button onClick={() => refetch()}>Reintentar</Button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No tienes álbumes guardados"
        description="Conecta Spotify para ver tus álbumes aquí."
      />
    );
  }

  return (
    <div>
      {onToggleAll && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50">
          <input
            type="checkbox"
            aria-label="Seleccionar todos los álbumes"
            checked={selectionState === 'all'}
            ref={(el) => {
              if (el) el.indeterminate = selectionState === 'some';
            }}
            onChange={onToggleAll}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-xs text-gray-500">Seleccionar todos</span>
        </div>
      )}
      <List selectedIds={[...selectedIds]} onSelect={onToggle}>
        {data.map((album) => (
          <ListItem key={album.spotifyId} id={album.spotifyId}>
            {onToggle && (
              <input
                type="checkbox"
                aria-label={`Seleccionar ${album.name}`}
                checked={selectedIds.has(album.spotifyId)}
                onChange={() => onToggle(album.spotifyId)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <span className="flex-1 text-sm font-medium text-gray-900">{album.name}</span>
            <ListItemTrailing>
              <span className="text-xs text-gray-500">{album.artist}</span>
            </ListItemTrailing>
          </ListItem>
        ))}
      </List>
    </div>
  );
}
