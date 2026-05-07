import { useState } from 'react';
import { Button, EmptyState, Input, List, ListItem, ListItemTrailing, Skeleton } from '@/components/ui';
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
  const [search, setSearch] = useState('');

  if (isLoading) return <PlaylistSkeletons />;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-red-400">No se pudieron cargar las playlists.</p>
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

  const lower = search.toLowerCase();
  const filtered = search
    ? data.filter((p) => p.name.toLowerCase().includes(lower))
    : data;

  return (
    <div>
      <div className="px-3 py-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar playlists..."
        />
      </div>
      {onToggleAll && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-700 bg-gray-800">
          <input
            type="checkbox"
            aria-label="Seleccionar todas las playlists"
            checked={selectionState === 'all'}
            ref={(el) => {
              if (el) el.indeterminate = selectionState === 'some';
            }}
            onChange={onToggleAll}
            className="h-4 w-4 rounded border-gray-500 text-primary-600"
          />
          <span className="text-xs text-gray-400">Seleccionar todas</span>
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="p-4 text-sm text-gray-400">Sin resultados.</p>
      ) : (
        <List selectedIds={[...selectedIds]} onSelect={onToggle}>
          {filtered.map((playlist) => (
            <ListItem key={playlist.id} id={playlist.id}>
              {onToggle && (
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${playlist.name}`}
                  checked={selectedIds.has(playlist.id)}
                  onChange={() => onToggle(playlist.id)}
                  className="h-4 w-4 rounded border-gray-500 text-primary-600"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <span className="flex-1 text-sm font-medium text-gray-200">{playlist.name}</span>
              <ListItemTrailing>
                <span className="text-xs text-gray-400">{playlist.trackCount} canciones</span>
              </ListItemTrailing>
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
}
