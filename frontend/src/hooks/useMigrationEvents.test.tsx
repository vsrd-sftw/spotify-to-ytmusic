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

  _msgRaw(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  _error() {
    this.onerror?.(new Event('error'));
  }

  _close() {
    this.readyState = 3;
    this.onclose?.(new CloseEvent('close'));
  }

  _closeClean() {
    this.readyState = 3;
    this.onclose?.(new CloseEvent('close', { code: 1000, wasClean: true }));
  }
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.useFakeTimers();
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
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

  it('does not reconnect when the server closes the stream cleanly (code 1000)', () => {
    const { result } = renderHook(() => useMigrationEvents('job-clean'));
    const socket = MockWebSocket.instances[0];

    act(() => socket._open());
    act(() => socket._closeClean());

    expect(result.current.state).toBe('closed');
    // No reconnect attempt scheduled — only the original socket exists.
    act(() => vi.advanceTimersByTime(10_000));
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(result.current.retryCount).toBe(0);
  });

  it('reconnects with exponential backoff on close', () => {
    const { result } = renderHook(() => useMigrationEvents('job-3'));
    const socket1 = MockWebSocket.instances[0];

    act(() => socket1._close());
    expect(result.current.state).toBe('reconnecting');

    act(() => vi.advanceTimersByTime(1000));

    expect(MockWebSocket.instances).toHaveLength(2);
    const socket2 = MockWebSocket.instances[1];
    act(() => socket2._open());

    expect(result.current.state).toBe('open');
    expect(result.current.retryCount).toBe(0);
  });

  it('stops retrying after max retries and reports exhausted', () => {
    const { result } = renderHook(() => useMigrationEvents('job-4'));

    const delays = [1000, 2000, 4000, 8000];

    for (let i = 0; i < 4; i++) {
      const socket = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      act(() => socket._close());
      expect(result.current.state).toBe('reconnecting');
      act(() => vi.advanceTimersByTime(delays[i]));
    }

    const lastSocket = MockWebSocket.instances[MockWebSocket.instances.length - 1];
    act(() => lastSocket._close());
    expect(result.current.state).toBe('exhausted');
    expect(result.current.retryCount).toBe(5);
  });

  it('exposes incrementally-reduced summary alongside the events array', () => {
    const { result } = renderHook(() => useMigrationEvents('job-summary'));
    const socket = MockWebSocket.instances[0];
    act(() => socket._open());

    act(() => socket._msg({ type: 'PlaylistsDiscovered', count: 1 }));
    act(() =>
      socket._msg({ type: 'PlaylistStarted', name: 'P1', trackCount: 7 }),
    );
    act(() =>
      socket._msg({
        type: 'PlaylistFinished',
        name: 'P1',
        found: 5,
        total: 7,
        notFoundLabels: ['x', 'y'],
      }),
    );

    expect(result.current.summary).toEqual({
      tracksFound: 5,
      tracksTotal: 7,
      albumsFound: 0,
      albumsTotal: 0,
      notFoundCount: 2,
    });
    expect(result.current.notFoundLabels).toEqual(['x', 'y']);
    expect(result.current.playlists).toHaveLength(1);
    expect(result.current.playlists[0]).toMatchObject({
      name: 'P1',
      status: 'completed',
      found: 5,
      total: 7,
    });
  });

  it('ignores malformed WS messages with a console warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useMigrationEvents('job-bad'));
    const socket = MockWebSocket.instances[0];
    act(() => socket._open());

    act(() => socket._msgRaw('not valid json'));

    expect(warn).toHaveBeenCalled();
    expect(result.current.events).toHaveLength(0);
    warn.mockRestore();
  });

  it('handles 1000 sequential events without breaking', () => {
    const { result } = renderHook(() => useMigrationEvents('job-stress'));
    const socket = MockWebSocket.instances[0];
    act(() => socket._open());

    act(() => {
      socket._msg({ type: 'PlaylistsDiscovered', count: 1 });
      socket._msg({ type: 'PlaylistStarted', name: 'P', trackCount: 1000 });
      for (let i = 0; i < 998; i++) {
        socket._msg({
          type: 'AlbumProcessed',
          label: `Album ${i}`,
          status: 'saved',
        });
      }
    });

    expect(result.current.events).toHaveLength(1000);
    expect(result.current.savedCount).toBe(998);
  });

  it('resets backoff on manual retry', () => {
    const { result } = renderHook(() => useMigrationEvents('job-5'));
    const socket1 = MockWebSocket.instances[0];

    act(() => socket1._close());
    act(() => vi.advanceTimersByTime(1000));

    const socket2 = MockWebSocket.instances[1];
    act(() => socket2._close());

    expect(result.current.state).toBe('reconnecting');
    expect(result.current.retryCount).toBe(2);

    act(() => result.current.retry());

    expect(result.current.retryCount).toBe(0);
    expect(result.current.state).toBe('connecting');
  });
});
