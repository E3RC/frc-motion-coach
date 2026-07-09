import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, RunDetail, TrackingSample } from '../api/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import FieldOverlay from '../field/FieldOverlay';

export default function RunReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [samples, setSamples] = useState<TrackingSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [playIndex, setPlayIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [editTitle, setEditTitle] = useState(false);
  const [editTitleVal, setEditTitleVal] = useState('');
  const [editNotes, setEditNotes] = useState(false);
  const [editNotesVal, setEditNotesVal] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getRun(Number(id)),
      api.getSamples(Number(id)),
    ]).then(([r, s]) => {
      setRun(r);
      setSamples(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!playing || samples.length === 0) return;
    const interval = setInterval(() => {
      setPlayIndex(i => {
        if (i >= samples.length - 1) {
          setPlaying(false);
          return samples.length - 1;
        }
        return i + 1;
      });
    }, 1000 / (30 * speed));
    return () => clearInterval(interval);
  }, [playing, samples, speed]);

  const replayPath = samples.slice(0, playIndex).map(s => ({ x: s.field_x, y: s.field_y }));
  const replayPos = samples[playIndex] ? { x: samples[playIndex].field_x, y: samples[playIndex].field_y } : null;

  const handleSaveTitle = async () => {
    if (!id || !run) return;
    const val = editTitleVal.replace(/^Run #\d+$/, '').trim();
    try {
      await api.updateRun(Number(id), { name: val || editTitleVal });
      setRun({ ...run, name: val || editTitleVal });
      setEditTitle(false);
    } catch { alert('Failed to save title.'); }
  };

  const handleSaveNotes = async () => {
    if (!id || !run) return;
    try {
      await api.updateRun(Number(id), { notes: editNotesVal });
      setRun({ ...run, notes: editNotesVal });
      setEditNotes(false);
    } catch { alert('Failed to save notes.'); }
  };

  const speedData = samples.map((s) => ({
    time: s.timestamp.toFixed(1),
    speed: Number(s.speed.toFixed(2)),
    acceleration: Number(s.acceleration.toFixed(2)),
    g: Number(s.estimated_g.toFixed(4)),
  }));

  if (loading) {
    return <div style={{ color: 'var(--fmc-text-muted)' }}>Loading run...</div>;
  }

  if (!run) {
    return <div style={{ color: 'var(--fmc-danger)' }}>Run not found.</div>;
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={() => navigate('/history')} style={{
        padding: '6px 14px', background: 'var(--fmc-border)', color: 'var(--fmc-text)',
        border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
        fontWeight: 600, fontFamily: 'var(--fmc-font-ui)', marginBottom: 16
      }}>
        ← Back to Runs
      </button>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{
              margin: '0 0 4px', color: 'var(--fmc-text)',
              fontFamily: 'var(--fmc-font-display)', fontWeight: 700,
            }}>
              {editTitle ? (
                <input value={editTitleVal} onChange={e => setEditTitleVal(e.target.value)}
                  onBlur={handleSaveTitle} onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditTitle(false); }}
                  style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--fmc-font-display)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--fmc-border)', background: 'var(--fmc-bg)', color: 'var(--fmc-text)', width: '100%', boxSizing: 'border-box' }}
                  autoFocus
                />
              ) : (
                <span style={{ cursor: 'pointer' }} onClick={() => { setEditTitleVal(run.name || `Run #${run.id}`); setEditTitle(true); }}>
                  {run.name || `Run #${run.id}`} ✎
                </span>
              )}
            </h2>
            <div style={{ fontSize: 13, color: 'var(--fmc-text-muted)', marginBottom: 16 }}>
              {new Date(run.created_at).toLocaleString()}
              {run.driver ? ` — Driver: ${run.driver}` : ''}
              {run.robot_config ? ` — Robot: ${run.robot_config}` : ''}
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: 8, marginBottom: 16
        }}>
          <Metric label="Duration" value={`${run.summary_metrics.duration_s?.toFixed(1) ?? '-'}s`} />
          <Metric label="Max Speed" value={`${run.summary_metrics.max_speed_ft_per_s?.toFixed(1) ?? '-'} ft/s`} color="var(--fmc-blue)" />
          <Metric label="Avg Speed" value={`${run.summary_metrics.avg_moving_speed_ft_per_s?.toFixed(1) ?? '-'} ft/s`} />
          <Metric label="Peak G" value={`${run.summary_metrics.peak_estimated_g?.toFixed(3) ?? '-'} g`} color="var(--fmc-alert-orange)" />
          <Metric label="Distance" value={`${run.summary_metrics.total_distance_ft?.toFixed(1) ?? '-'} ft`} />
          <Metric label="Moving" value={`${run.summary_metrics.time_moving_s?.toFixed(1) ?? '-'}s`} color="var(--fmc-motion-green)" />
          <Metric label="Stopped" value={`${run.summary_metrics.time_stopped_s?.toFixed(1) ?? '-'}s`} color="var(--fmc-danger)" />
        </div>

        <div style={{ paddingTop: 12, borderTop: '1px solid var(--fmc-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--fmc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Notes</div>
            <button onClick={() => { if (!editNotes) setEditNotesVal(run.notes || ''); setEditNotes(!editNotes); }} style={{
              padding: '2px 8px', background: 'var(--fmc-border)', color: 'var(--fmc-text)',
              border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 600,
              fontFamily: 'var(--fmc-font-ui)',
            }}>
              {editNotes ? 'Cancel' : (run.notes ? 'Edit' : 'Add')}
            </button>
          </div>
          {editNotes ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea value={editNotesVal} onChange={e => setEditNotesVal(e.target.value)}
                placeholder="Add notes about this run..."
                style={{ width: '100%', minHeight: 60, resize: 'vertical', boxSizing: 'border-box', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--fmc-border)', background: 'var(--fmc-bg)', color: 'var(--fmc-text)', fontSize: 12, fontFamily: 'var(--fmc-font-ui)' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleSaveNotes} style={{ padding: '5px 14px', background: 'var(--fmc-blue)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700, fontSize: 11, fontFamily: 'var(--fmc-font-ui)' }}>Save</button>
                <button onClick={() => setEditNotes(false)} style={{ padding: '5px 14px', background: 'var(--fmc-border)', color: 'var(--fmc-text)', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 11, fontFamily: 'var(--fmc-font-ui)' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--fmc-text-muted)', lineHeight: 1.5, minHeight: 20 }}>
              {run.notes || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No notes</span>}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={h3Style}>Path Replay</h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => { setPlaying(!playing); if (!playing) setPlayIndex(0); }}
                style={{
                  padding: '5px 12px', border: 'none', borderRadius: 4,
                  cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  fontFamily: 'var(--fmc-font-ui)',
                  background: playing ? 'var(--fmc-danger)' : 'var(--fmc-blue)',
                  color: 'white',
                }}
              >
                {playing ? 'Stop' : 'Play'}
              </button>
              <button
                onClick={() => { setPlayIndex(0); setPlaying(false); }}
                style={{
                  padding: '5px 10px', border: 'none', borderRadius: 4,
                  cursor: 'pointer', fontWeight: 600, fontSize: 12,
                  fontFamily: 'var(--fmc-font-ui)',
                  background: 'var(--fmc-border)', color: 'var(--fmc-text)',
                }}
              >
                Reset
              </button>
              <select value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{
                padding: '4px 6px', background: 'var(--fmc-bg)', color: 'var(--fmc-text)',
                border: '1px solid var(--fmc-border)', borderRadius: 4, fontSize: 11,
                fontFamily: 'var(--fmc-font-ui)',
              }}>
                <option value={0.5}>0.5×</option>
                <option value={1}>1×</option>
                <option value={2}>2×</option>
                <option value={4}>4×</option>
              </select>
              <span style={{ fontSize: 11, color: 'var(--fmc-text-muted)' }}>
                {playIndex}/{samples.length}
              </span>
            </div>
          </div>
          <FieldOverlay path={replayPath} currentPos={replayPos} width={27} height={27} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cardStyle}>
            <h3 style={h3Style}>Speed Over Time</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={speedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" />
                <XAxis dataKey="time" tick={{ fill: '#8D98A6', fontSize: 10 }} />
                <YAxis tick={{ fill: '#8D98A6', fontSize: 10 }} unit=" ft/s" />
                <Tooltip
                  contentStyle={{ background: '#1B2733', border: '1px solid #2A3A4A', borderRadius: 6 }}
                  labelStyle={{ color: '#8D98A6' }}
                />
                <Area type="monotone" dataKey="speed" stroke="#0057D9" fill="#0057D9" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <h3 style={h3Style}>Acceleration Over Time</h3>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={speedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" />
                <XAxis dataKey="time" tick={{ fill: '#8D98A6', fontSize: 10 }} />
                <YAxis tick={{ fill: '#8D98A6', fontSize: 10 }} unit=" ft/s²" />
                <Tooltip
                  contentStyle={{ background: '#1B2733', border: '1px solid #2A3A4A', borderRadius: 6 }}
                  labelStyle={{ color: '#8D98A6' }}
                />
                <Area type="monotone" dataKey="acceleration" stroke="#FF7A00" fill="#FF7A00" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={cardStyle}>
            <h3 style={h3Style}>Estimated G-Force</h3>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={speedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" />
                <XAxis dataKey="time" tick={{ fill: '#8D98A6', fontSize: 10 }} />
                <YAxis tick={{ fill: '#8D98A6', fontSize: 10 }} unit=" g" />
                <Tooltip
                  contentStyle={{ background: '#1B2733', border: '1px solid #2A3A4A', borderRadius: 6 }}
                  labelStyle={{ color: '#8D98A6' }}
                />
                <Area type="monotone" dataKey="g" stroke="#22A83A" fill="#22A83A" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>Export</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`/api/runs/${id}/export.csv`} target="_blank" style={linkBtnStyle}>Export CSV</a>
          <a href={`/api/runs/${id}/export.json`} target="_blank" style={linkBtnStyle}>Export JSON</a>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--fmc-text-muted)', lineHeight: 1.5 }}>
          Tracking data is estimated from camera vision and calibration. Results are intended for practice
          analysis, not official scoring, inspection, or competition use.
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--fmc-bg)', borderRadius: 8, padding: '8px 12px', textAlign: 'center'
    }}>
      <div style={{
        fontSize: 10, color: 'var(--fmc-text-muted)', textTransform: 'uppercase',
        letterSpacing: '1px', marginBottom: 2
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 20, fontWeight: 700, fontFamily: 'var(--fmc-font-display)',
        color: color ?? 'var(--fmc-text)',
      }}>
        {value}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--fmc-surface)', borderRadius: 12, padding: 16,
  border: '1px solid var(--fmc-border)', marginBottom: 16,
};

const h3Style: React.CSSProperties = {
  margin: 0, fontSize: 12, color: 'var(--fmc-text-muted)',
  textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700,
};

const linkBtnStyle: React.CSSProperties = {
  display: 'inline-block', padding: '8px 16px', background: 'var(--fmc-blue)',
  color: 'white', borderRadius: 6, textDecoration: 'none', fontSize: 13,
  fontWeight: 700, fontFamily: 'var(--fmc-font-ui)',
};
