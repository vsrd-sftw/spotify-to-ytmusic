import { useState } from 'react';

export type SelectionState = 'none' | 'some' | 'all';

export interface UseSelectionResult {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  toggleAll: () => void;
  selectionState: SelectionState;
}

export function useSelection<T>(items: T[], getId: (item: T) => string): UseSelectionResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === items.length && items.length > 0) {
        return new Set();
      }
      return new Set(items.map(getId));
    });
  };

  const selectionState: SelectionState =
    selectedIds.size === 0
      ? 'none'
      : selectedIds.size === items.length
        ? 'all'
        : 'some';

  return { selectedIds, toggle, toggleAll, selectionState };
}
