import { useSelectionContext } from '@/contexts/useSelectionContext';

export type SelectionState = 'none' | 'some' | 'all';
export type SelectionKind = 'playlists' | 'albums';

export interface UseSelectionResult {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  toggleAll: () => void;
  selectionState: SelectionState;
}

export function useSelection<T>(
  items: T[],
  getId: (item: T) => string,
  kind: SelectionKind,
): UseSelectionResult {
  const ctx = useSelectionContext();

  const selectedIds = kind === 'playlists' ? ctx.selectedPlaylistIds : ctx.selectedAlbumIds;
  const toggle = kind === 'playlists' ? ctx.togglePlaylist : ctx.toggleAlbum;
  const toggleAll = () => {
    const ids = items.map(getId);
    if (kind === 'playlists') {
      ctx.toggleAllPlaylists(ids);
    } else {
      ctx.toggleAllAlbums(ids);
    }
  };

  const selectionState: SelectionState =
    selectedIds.size === 0
      ? 'none'
      : selectedIds.size === items.length && items.length > 0
        ? 'all'
        : 'some';

  return { selectedIds, toggle, toggleAll, selectionState };
}
