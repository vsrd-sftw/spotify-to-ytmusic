import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { SelectionContext, type SelectionContextValue } from './SelectionContextValue'

function toggleInSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  return next
}

function toggleAllInSet(prev: Set<string>, ids: string[]): Set<string> {
  if (ids.length > 0 && prev.size === ids.length && ids.every((id) => prev.has(id))) {
    return new Set()
  }
  return new Set(ids)
}

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedPlaylistIds, setPlaylistIds] = useState<Set<string>>(new Set())
  const [selectedAlbumIds, setAlbumIds] = useState<Set<string>>(new Set())

  const togglePlaylist = useCallback((id: string) => {
    setPlaylistIds((prev) => toggleInSet(prev, id))
  }, [])

  const toggleAlbum = useCallback((id: string) => {
    setAlbumIds((prev) => toggleInSet(prev, id))
  }, [])

  const toggleAllPlaylists = useCallback((ids: string[]) => {
    setPlaylistIds((prev) => toggleAllInSet(prev, ids))
  }, [])

  const toggleAllAlbums = useCallback((ids: string[]) => {
    setAlbumIds((prev) => toggleAllInSet(prev, ids))
  }, [])

  const clearAll = useCallback(() => {
    setPlaylistIds(new Set())
    setAlbumIds(new Set())
  }, [])

  const value = useMemo<SelectionContextValue>(
    () => ({
      selectedPlaylistIds,
      selectedAlbumIds,
      togglePlaylist,
      toggleAlbum,
      toggleAllPlaylists,
      toggleAllAlbums,
      clearAll,
    }),
    [
      selectedPlaylistIds,
      selectedAlbumIds,
      togglePlaylist,
      toggleAlbum,
      toggleAllPlaylists,
      toggleAllAlbums,
      clearAll,
    ],
  )

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}
