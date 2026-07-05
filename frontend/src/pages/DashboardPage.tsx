import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { useWebSocket, LiveTrackingData } from '../hooks/useWebSocket';
import FieldOverlay from '../field/FieldOverlay';

export default function DashboardPage() {
  const [tracking, setTracking] = useState(false);
  const [runActive, setRunActive] = useState(false);
  const [runId, setRunId] = useState<number | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [practiceType, setPracticeType] = useState('Driver Practice');
  const [driverName, setDriverName] = useState('');
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [frameTs, setFrameTs] = useState(0);
  const [liveSpeed, setLiveSpeed] = useState(0);
  const [liveAccel, setLiveAccel] = useState(0);
  const [liveG, setLiveG] = useState(0);
  const [liveConfidence, setLiveConfidence] = useState(0);
  const [liveState, setLiveState] = useState('');

  const { data: liveData, connected } = useWebSocket('/api/ws/live-tracking');

  useEffect(() => {
    if (liveData && liveData.confidence > 0) {
      setCurrentPos({ x: liveData.field_x, y: liveData.field_y });
      setPath(prev => [...prev.slice(-500), { x: liveData.field_x, y: liveData.field_y }]);
      setLiveSpeed(liveData.speed);
      setLiveAccel(liveData.acceleration);
      setLiveG(liveData.estimated_g);
      setLiveConfidence(liveData.confidence);
      setLiveState(liveData.state);
    }
  }, [liveData]);

  // Refresh camera feed img tag independently
  useEffect(() => {
    if (!tracking) return;
    const id = setInterval(() => setFrameTs(t => t + 1), 50);
    return () => clearInterval(id);
  }, [tracking]);

  const handleStartTracking = async () => {
    await api.startTracking();
    setTracking(true);
    setPath([]);
    setCurrentPos(null);
    setSummary(null);
    setLiveSpeed(0); setLiveAccel(0); setLiveG(0); setLiveConfidence(0);
  };

  const handleStopTracking = async () => {
    await api.stopTracking();
    setTracking(false);
    const s = await api.getTrackingSummary();
    setSummary(s);
  };

  const handleStartRun = async () => {
    const res = await api.startRun({
      name: `${practiceType} - ${new Date().toLocaleTimeString()}`,
      driver: driverName,
      practice_type: practiceType,
    });
    setRunId(res.run_id);
    setRunActive(true);
    setPath([]);
    setCurrentPos(null);
  };

  const handleStopRun = async () => {
    if (runId === null) return;
    const s = await api.getTrackingSummary();
    await api.stopRun(s);
    setRunActive(false);
    setRunId(null);
    setSummary(s);
  };

  return (
    <div>
      {!connected && (
        <div style={{
          background: 'var(--fmc-danger)', color: 'white', padding: '10px 16px',
          borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600,
        }}>
          Camera disconnected — backend not reachable. Make sure the server is running.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cardStyle}>
            <h3 style={h3Style}>Camera Feed</h3>
            {tracking ? (
              <img
                src={`/api/camera/frame.jpg?t=${frameTs}`}
                alt="Camera feed"
                style={{
                  width: '100%', height: 360, borderRadius: 8,
                  objectFit: 'contain', background: '#000',
                }}
              />
            ) : (
              <div style={{
                width: '100%', height: 360, background: 'var(--fmc-surface)',
                borderRadius: 8, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--fmc-text-muted)', fontSize: 13, gap: 8,
              }}>
                <span style={{ fontSize: 40, opacity: 0.3 }}>📷</span>
                <div>Press "Start Camera Tracking" to begin</div>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h3 style={h3Style}>Run Controls</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={practiceType}
                onChange={e => setPracticeType(e.target.value)}
                style={selectStyle}
              >
                <option>Driver Practice</option>
                <option>Auto Routine</option>
                <option>Swerve Tuning</option>
                <option>Path Following</option>
                <option>Free Practice</option>
              </select>
              <input
                placeholder="Driver name"
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {!tracking ? (
                <button onClick={handleStartTracking} style={btnPrimary}>
                  Start Camera Tracking
                </button>
              ) : (
                <button onClick={handleStopTracking} style={btnDanger}>
                  Stop Tracking
                </button>
              )}
              {tracking && !runActive ? (
                <button onClick={handleStartRun} style={btnSuccess}>
                  Start Recording
                </button>
              ) : null}
              {runActive ? (
                <button onClick={handleStopRun} style={btnDanger}>
                  Stop Recording
                </button>
              ) : null}
            </div>
            {runActive && (
              <div style={{ marginTop: 10, color: 'var(--fmc-motion-green)', fontSize: 13, fontWeight: 600 }}>
                Recording run #{runId}...
              </div>
            )}
            {!tracking && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--fmc-text-muted)', lineHeight: 1.5 }}>
                Tracking data is estimated from camera vision and calibration.
                Results are intended for practice analysis, not official scoring,
                inspection, or competition use.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cardStyle}>
            <h3 style={h3Style}>Field View</h3>
            <FieldOverlay
              path={path}
              currentPos={currentPos}
              width={27}
              height={27}
            />
          </div>

          <div style={cardStyle}>
            <h3 style={h3Style}>Live Metrics</h3>
            <div style={statsGridStyle}>
              <StatBox label="Speed" value={tracking ? liveSpeed.toFixed(2) : '-'} unit="ft/s" />
              <StatBox label="Max Speed" value={summary?.max_speed_ft_per_s?.toFixed(2) ?? '-'} unit="ft/s" color="var(--fmc-blue)" />
              <StatBox label="Accel" value={tracking ? liveAccel.toFixed(2) : '-'} unit="ft/s²" />
              <StatBox label="Est. G-Force" value={tracking ? liveG.toFixed(3) : '-'} unit="g" color="var(--fmc-alert-orange)" />
              <StatBox label="Distance" value={summary?.total_distance_ft?.toFixed(1) ?? '-'} unit="ft" />
              <StatBox label="Moving" value={summary?.time_moving_s?.toFixed(1) ?? '-'} unit="s" color="var(--fmc-motion-green)" />
              <StatBox label="Stopped" value={summary?.time_stopped_s?.toFixed(1) ?? '-'} unit="s" color="var(--fmc-danger)" />
              <StatBox label="Confidence" value={tracking ? `${(liveConfidence * 100).toFixed(0)}%` : '-'} unit="" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, unit, color }: { label: string; value: string; unit: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--fmc-surface)', borderRadius: 8, padding: '10px 12px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, color: 'var(--fmc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 700, fontFamily: 'var(--fmc-font-display)',
        color: color ?? 'var(--fmc-text)',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--fmc-text-muted)' }}>{unit}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--fmc-surface)', borderRadius: 12, padding: 16,
  border: '1px solid var(--fmc-border)',
};

const h3Style: React.CSSProperties = {
  margin: '0 0 12px 0', fontSize: 12, color: 'var(--fmc-text-muted)',
  textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700,
};

const statsGridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
};

const btnBase: React.CSSProperties = {
  padding: '8px 18px', border: 'none', borderRadius: 6,
  cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'var(--fmc-font-ui)',
  letterSpacing: '0.5px',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase, background: 'var(--fmc-blue)', color: 'white',
};

const btnDanger: React.CSSProperties = {
  ...btnBase, background: 'var(--fmc-danger)', color: 'white',
};

const btnSuccess: React.CSSProperties = {
  ...btnBase, background: 'var(--fmc-motion-green)', color: 'white',
};

const selectStyle: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 6, border: '1px solid var(--fmc-border)',
  background: 'var(--fmc-bg)', color: 'var(--fmc-text)', fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)',
};

const inputStyle: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 6, border: '1px solid var(--fmc-border)',
  background: 'var(--fmc-bg)', color: 'var(--fmc-text)', fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)', flex: 1,
};
