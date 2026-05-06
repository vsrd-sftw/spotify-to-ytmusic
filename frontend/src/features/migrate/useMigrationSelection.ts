export interface MigrationSelection {
  playlistCount: number;
  albumCount: number;
  total: number;
  isEmpty: boolean;
  selectedPlaylistIds: Set<string>;
  selectedAlbumIds: Set<string>;
}

export function useMigrationSelection(
  selectedPlaylistIds: Set<string>,
  selectedAlbumIds: Set<string>,
): MigrationSelection {
  const playlistCount = selectedPlaylistIds.size;
  const albumCount = selectedAlbumIds.size;
  return {
    playlistCount,
    albumCount,
    total: playlistCount + albumCount,
    isEmpty: playlistCount + albumCount === 0,
    selectedPlaylistIds,
    selectedAlbumIds,
  };
}
