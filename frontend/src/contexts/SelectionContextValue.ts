import { createContext } from 'react'

export interface SelectionContextValue {
  selectedPlaylistIds: Set<string>
  selectedAlbumIds: Set<string>
  togglePlaylist: (id: string) => void
  toggleAlbum: (id: string) => void
  toggleAllPlaylists: (ids: string[]) => void
  toggleAllAlbums: (ids: string[]) => void
  clearAll: () => void
}

export const SelectionContext = createContext<SelectionContextValue | null>(null)
