import { useState } from 'react';
import { Button, EmptyState, Input, List, ListItem, ListItemTrailing, Skeleton } from '@/components/ui';
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
  const [search, setSearch] = useState('');

  if (isLoading) return <AlbumSkeletons />;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-red-400">No se pudieron cargar los álbumes.</p>
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

  const lower = search.toLowerCase();
  const filtered = search
    ? data.filter((a) => a.name.toLowerCase().includes(lower) || a.artist.toLowerCase().includes(lower))
    : data;

  return (
    <div>
      <div className="px-3 py-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar álbumes..."
        />
      </div>
      {onToggleAll && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-700 bg-gray-800">
          <input
            type="checkbox"
            aria-label="Seleccionar todos los álbumes"
            checked={selectionState === 'all'}
            ref={(el) => {
              if (el) el.indeterminate = selectionState === 'some';
            }}
            onChange={onToggleAll}
            className="h-4 w-4 rounded border-gray-500 text-primary-600"
          />
          <span className="text-xs text-gray-400">Seleccionar todos</span>
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="p-4 text-sm text-gray-400">Sin resultados.</p>
      ) : (
        <List selectedIds={[...selectedIds]} onSelect={onToggle}>
          {filtered.map((album) => (
            <ListItem key={album.spotifyId} id={album.spotifyId}>
              {onToggle && (
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${album.name}`}
                  checked={selectedIds.has(album.spotifyId)}
                  onChange={() => onToggle(album.spotifyId)}
                  className="h-4 w-4 rounded border-gray-500 text-primary-600"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <span className="flex-1 text-sm font-medium text-gray-200">{album.name}</span>
              <ListItemTrailing>
                <span className="text-xs text-gray-400">{album.artist}</span>
              </ListItemTrailing>
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
}
