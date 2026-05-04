import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMigrationEvents } from './useMigrationEvents';
import type { MigrationEvent } from '@/types/api';

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  readyState = 0;
  url: string;
  close = vi.fn(() => {
    this.readyState = 3;
    this.onclose?.(new CloseEvent('close'));
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  _open() {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  _msg(data: unknown) {
    this.onmessage?.(
      new MessageEvent('message', { data: JSON.stringify(data) }),
    );
  }
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMigrationEvents', () => {
  it('accumulates incoming events in order', () => {
    const { result } = renderHook(() => useMigrationEvents('job-1'));
    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();
    expect(socket.url).toMatch(/\/api\/migrate\/job-1\/events$/);

    const a: MigrationEvent = { type: 'PlaylistsDiscovered', count: 2 };
    const b: MigrationEvent = {
      type: 'PlaylistStarted',
      name: 'Mis favoritos',
      trackCount: 10,
    };

    act(() => socket._open());
    act(() => socket._msg(a));
    act(() => socket._msg(b));

    expect(result.current.state).toBe('open');
    expect(result.current.events).toEqual([a, b]);
  });

  it('closes the socket on unmount', () => {
    const { unmount } = renderHook(() => useMigrationEvents('job-2'));
    const socket = MockWebSocket.instances[0];
    unmount();
    expect(socket.close).toHaveBeenCalled();
  });

  it('does not open a socket when jobId is null', () => {
    const { result } = renderHook(() => useMigrationEvents(null));
    expect(MockWebSocket.instances).toHaveLength(0);
    expect(result.current.state).toBe('closed');
    expect(result.current.events).toEqual([]);
  });
});
