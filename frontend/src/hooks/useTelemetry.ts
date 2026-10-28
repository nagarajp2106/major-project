import { useState, useEffect, useRef } from 'react';
import { TelemetryData } from '../types';

export interface TelemetryHistoryPoint {
  time: string;
  angle: number;
  velocity: number;
  accel: number;
  fps: number;
}

export function useTelemetry(onEmergencyAlert?: (alert: any) => void) {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    fps: 0,
    status: 'CONNECTING',
    source: 'demo',
    frame_index: 0,
    active_tracks_count: 0,
    tracks: [],
    alerts: [],
  });

  const [history, setHistory] = useState<TelemetryHistoryPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  useEffect(() => {
    let unmounted = false;

    function connect() {
      // Determine proper WS URL
      const host = window.location.host;
      const wsUrl = window.location.protocol === 'https:'
        ? `wss://${host}/ws/telemetry`
        : `ws://${host.includes(':5173') ? 'localhost:8000' : host}/ws/telemetry`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) return;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (unmounted) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'TELEMETRY_UPDATE') {
            const data: TelemetryData = message.data;
            setTelemetry(data);

            // Check for emergency fall alert
            if (data.alerts && data.alerts.length > 0) {
              const confirmed = data.alerts.find(
                (a: any) => a.state === 'CONFIRMED_FALL' || a.state === 'FALL_DETECTED'
              );
              if (confirmed && onEmergencyAlert) {
                onEmergencyAlert(confirmed);
              }
            }

            // Extract primary track kinematics for graph
            const primaryTrack = data.tracks[0];
            const now = new Date();
            const timeStr = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${Math.floor(now.getMilliseconds() / 100)}`;

            setHistory((prev) => {
              const nextPoint: TelemetryHistoryPoint = {
                time: timeStr,
                angle: primaryTrack ? primaryTrack.torso_angle : 0,
                velocity: primaryTrack ? primaryTrack.vertical_velocity : 0,
                accel: primaryTrack ? primaryTrack.vertical_acceleration : 0,
                fps: data.fps || 0,
              };
              const updated = [...prev, nextPoint];
              return updated.length > 30 ? updated.slice(updated.length - 30) : updated;
            });
          }
        } catch (e) {
          console.error('[useTelemetry] Parse error:', e);
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        setIsConnected(false);
        setTelemetry((prev) => ({ ...prev, status: 'DISCONNECTED' }));
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { telemetry, history, isConnected };
}
