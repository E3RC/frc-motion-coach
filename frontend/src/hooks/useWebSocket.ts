import { useEffect, useRef, useState, useCallback } from 'react';

export interface LiveTrackingData {
  timestamp: number;
  frame_number: number;
  field_x: number;
  field_y: number;
  speed: number;
  acceleration: number;
  estimated_g: number;
  confidence: number;
  state: string;
}

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [data, setData] = useState<LiveTrackingData | null>(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef<((d: LiveTrackingData) => void)[]>([]);

  const onData = useCallback((cb: (d: LiveTrackingData) => void) => {
    listenersRef.current.push(cb);
    return () => {
      listenersRef.current = listenersRef.current.filter(l => l !== cb);
    };
  }, []);

  useEffect(() => {
    const wsUrl = url.startsWith('ws') ? url : `ws://${window.location.host}${url}`;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let mounted = true;

    function connect() {
      if (!mounted) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (mounted) setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const d: LiveTrackingData = JSON.parse(event.data);
          if (mounted) {
            setData(d);
            listenersRef.current.forEach(cb => cb(d));
          }
        } catch { }
      };

      ws.onclose = () => {
        if (mounted) {
          setConnected(false);
          reconnectTimer = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      mounted = false;
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  return { data, connected, onData };
}
