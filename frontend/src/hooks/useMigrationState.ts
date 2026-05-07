import { useSyncExternalStore } from 'react';

let _isMigrating = false;
const _listeners = new Set<() => void>();

export function setIsMigrating(v: boolean) {
  _isMigrating = v;
  _listeners.forEach((fn) => fn());
}

export function useMigrationState(): boolean {
  return useSyncExternalStore(
    (cb) => {
      _listeners.add(cb);
      return () => _listeners.delete(cb);
    },
    () => _isMigrating,
  );
}
