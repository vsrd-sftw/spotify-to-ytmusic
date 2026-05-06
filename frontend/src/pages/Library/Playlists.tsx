import { Button, EmptyState, List, ListItem, ListItemTrailing, Skeleton } from '@/components/ui';
import { usePlaylists } from '@/features/library/usePlaylists';

function PlaylistSkeletons() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} variant="text" height={24} />
      ))}
    </div>
  );
}

export function Playlists() {
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
    <List>
      {data.map((playlist) => (
        <ListItem key={playlist.id} id={playlist.id}>
          <span className="flex-1 text-sm font-medium text-gray-900">{playlist.name}</span>
          <ListItemTrailing>
            <span className="text-xs text-gray-500">{playlist.trackCount} canciones</span>
          </ListItemTrailing>
        </ListItem>
      ))}
    </List>
  );
}
