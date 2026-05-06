import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { SelectionProvider } from './SelectionContext'
import { useSelectionContext } from './useSelectionContext'

describe('SelectionContext', () => {
  it('exposes empty initial state', () => {
    const { result } = renderHook(() => useSelectionContext(), {
      wrapper: SelectionProvider,
    })
    expect(result.current.selectedPlaylistIds.size).toBe(0)
    expect(result.current.selectedAlbumIds.size).toBe(0)
  })

  it('togglePlaylist adds and removes ids', () => {
    const { result } = renderHook(() => useSelectionContext(), {
      wrapper: SelectionProvider,
    })
    act(() => result.current.togglePlaylist('p1'))
    expect(result.current.selectedPlaylistIds.has('p1')).toBe(true)
    act(() => result.current.togglePlaylist('p1'))
    expect(result.current.selectedPlaylistIds.has('p1')).toBe(false)
  })

  it('toggleAllPlaylists adds all when not all selected and clears when all selected', () => {
    const { result } = renderHook(() => useSelectionContext(), {
      wrapper: SelectionProvider,
    })
    act(() => result.current.toggleAllPlaylists(['a', 'b', 'c']))
    expect(result.current.selectedPlaylistIds.size).toBe(3)
    act(() => result.current.toggleAllPlaylists(['a', 'b', 'c']))
    expect(result.current.selectedPlaylistIds.size).toBe(0)
  })

  it('clearAll resets both slices', () => {
    const { result } = renderHook(() => useSelectionContext(), {
      wrapper: SelectionProvider,
    })
    act(() => {
      result.current.togglePlaylist('p1')
      result.current.toggleAlbum('a1')
    })
    expect(result.current.selectedPlaylistIds.size).toBe(1)
    expect(result.current.selectedAlbumIds.size).toBe(1)
    act(() => result.current.clearAll())
    expect(result.current.selectedPlaylistIds.size).toBe(0)
    expect(result.current.selectedAlbumIds.size).toBe(0)
  })

  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useSelectionContext())).toThrow(
      /useSelectionContext must be used within SelectionProvider/,
    )
  })
})
