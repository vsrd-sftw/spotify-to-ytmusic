import { useEffect, useRef } from 'react';

/**
 * Returns a ref that, when attached to a focusable heading on the page,
 * receives focus on mount and whenever a value in `deps` changes (so a page
 * with multiple render branches refocuses the new heading).
 */
export function useAutoFocusHeading<T extends HTMLElement = HTMLHeadingElement>(
  deps: ReadonlyArray<unknown> = [],
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
