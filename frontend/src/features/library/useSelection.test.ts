import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SelectionProvider } from '@/contexts/SelectionContext';
import { useSelection } from './useSelection';

const items = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
];
const getId = (item: { id: string }) => item.id;

describe('useSelection', () => {
  it('starts with none selected', () => {
    const { result } = renderHook(() => useSelection(items, getId, 'playlists'), {
      wrapper: SelectionProvider,
    });
    expect(result.current.selectionState).toBe('none');
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('toggleAll selects all items → state becomes all', () => {
    const { result } = renderHook(() => useSelection(items, getId, 'playlists'), {
      wrapper: SelectionProvider,
    });
    act(() => result.current.toggleAll());
    expect(result.current.selectionState).toBe('all');
    expect(result.current.selectedIds.size).toBe(items.length);
  });

  it('after select all, deselecting one item → state becomes some (indeterminate)', () => {
    const { result } = renderHook(() => useSelection(items, getId, 'playlists'), {
      wrapper: SelectionProvider,
    });
    act(() => result.current.toggleAll());
    act(() => result.current.toggle('a'));
    expect(result.current.selectionState).toBe('some');
    expect(result.current.selectedIds.has('a')).toBe(false);
    expect(result.current.selectedIds.has('b')).toBe(true);
  });

  it('deselecting all remaining items → state becomes none', () => {
    const { result } = renderHook(() => useSelection(items, getId, 'playlists'), {
      wrapper: SelectionProvider,
    });
    act(() => result.current.toggleAll());
    act(() => result.current.toggle('a'));
    act(() => result.current.toggle('b'));
    act(() => result.current.toggle('c'));
    expect(result.current.selectionState).toBe('none');
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('toggleAll when all are selected deselects all → state becomes none', () => {
    const { result } = renderHook(() => useSelection(items, getId, 'playlists'), {
      wrapper: SelectionProvider,
    });
    act(() => result.current.toggleAll());
    act(() => result.current.toggleAll());
    expect(result.current.selectionState).toBe('none');
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('toggleAll with empty items list stays none', () => {
    const { result } = renderHook(() => useSelection([], getId, 'playlists'), {
      wrapper: SelectionProvider,
    });
    act(() => result.current.toggleAll());
    expect(result.current.selectionState).toBe('none');
  });

  it('toggle adds an id when not selected', () => {
    const { result } = renderHook(() => useSelection(items, getId, 'playlists'), {
      wrapper: SelectionProvider,
    });
    act(() => result.current.toggle('b'));
    expect(result.current.selectedIds.has('b')).toBe(true);
    expect(result.current.selectionState).toBe('some');
  });

  it('toggle removes an id when already selected', () => {
    const { result } = renderHook(() => useSelection(items, getId, 'playlists'), {
      wrapper: SelectionProvider,
    });
    act(() => result.current.toggle('b'));
    act(() => result.current.toggle('b'));
    expect(result.current.selectedIds.has('b')).toBe(false);
    expect(result.current.selectionState).toBe('none');
  });

  it('playlists and albums slices are independent', () => {
    const wrapper = SelectionProvider;
    const { result } = renderHook(
      () => ({
        playlists: useSelection(items, getId, 'playlists'),
        albums: useSelection(items, getId, 'albums'),
      }),
      { wrapper },
    );
    act(() => result.current.playlists.toggle('a'));
    expect(result.current.playlists.selectedIds.has('a')).toBe(true);
    expect(result.current.albums.selectedIds.has('a')).toBe(false);
  });
});
