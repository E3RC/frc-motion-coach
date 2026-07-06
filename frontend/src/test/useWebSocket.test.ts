import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../hooks/useWebSocket';

class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;
  send = vi.fn();
  close = vi.fn();
}

let mockWs: MockWebSocket;
let originalWebSocket: any;

beforeEach(() => {
  mockWs = new MockWebSocket();
  originalWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = vi.fn(() => mockWs) as any;
});

afterEach(() => {
  globalThis.WebSocket = originalWebSocket;
});

describe('useWebSocket', () => {
  it('connects and receives data', async () => {
    const { result } = renderHook(() => useWebSocket('/api/ws/live-tracking'));

    act(() => {
      mockWs.onopen?.();
    });

    expect(result.current.connected).toBe(true);

    const testData = { field_x: 10, field_y: 20, speed: 5, confidence: 0.9 };
    act(() => {
      mockWs.onmessage?.({ data: JSON.stringify(testData) });
    });

    expect(result.current.data).toEqual(testData);
  });

  it('reconnects on close', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWebSocket('/api/ws/live-tracking'));

    act(() => {
      mockWs.onclose?.();
    });

    expect(result.current.connected).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('has onData callback listener', async () => {
    const { result } = renderHook(() => useWebSocket('/api/ws/live-tracking'));

    const callback = vi.fn();
    act(() => {
      result.current.onData(callback);
    });

    act(() => {
      mockWs.onopen?.();
      mockWs.onmessage?.({ data: JSON.stringify({ speed: 10 }) });
    });

    expect(callback).toHaveBeenCalledWith({ speed: 10 });
  });
});
