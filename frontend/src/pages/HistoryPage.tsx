import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, RunSummary } from '../api/client';

export default function HistoryPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const navigate = useNavigate();

  const loadRuns = () => {
    api.getRuns().then(r => {
      setRuns(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(loadRuns, []);

  const exportCSV = async (id: number) => {
    window.open(`/api/runs/${id}/export.csv`, '_blank');
  };

  const exportJSON = async (id: number) => {
    window.open(`/api/runs/${id}/export.json`, '_blank');
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name || `Run #${id}`}"? This cannot be undone.`)) return;
    try {
      await api.deleteRun(id);
      setRuns(prev => prev.filter(r => r.id !== id));
      setSelected(prev => prev.filter(s => s !== id));
    } catch (err) {
      alert('Failed to delete run.');
    }
  };

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleCompare = () => {
    if (selected.length >= 2) {
      navigate(`/compare?ids=${selected.join(',')}`);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--fmc-text-muted)' }}>Loading runs...</div>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16
      }}>
        <h2 style={{
          margin: 0, color: 'var(--fmc-text)',
          fontFamily: 'var(--fmc-font-display)', fontWeight: 700,
        }}>
          Run History
        </h2>
        <span style={{ fontSize: 13, color: 'var(--fmc-text-muted)' }}>
          {runs.length} run{runs.length !== 1 ? 's' : ''} saved
        </span>
      </div>

      {runs.length === 0 ? (
        <div style={{
          background: 'var(--fmc-surface)', borderRadius: 12, padding: 40,
          textAlign: 'center', color: 'var(--fmc-text-muted)',
          border: '1px solid var(--fmc-border)'
        }}>
          <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.3 }}>🏁</div>
          <div style={{ fontWeight: 600 }}>No runs recorded yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            Go to the Live Dashboard to start a recording.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {runs.map(run => (
            <div
              key={run.id}
              style={{
                background: selected.includes(run.id) ? '#0A1A3A' : 'var(--fmc-surface)',
                borderRadius: 10, padding: 16, border: '1px solid var(--fmc-border)',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onClick={() => navigate(`/runs/${run.id}`)}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(run.id)}
                    onChange={() => {}}
                    onClick={(e) => toggleSelect(run.id, e)}
                    style={{ cursor: 'pointer', accentColor: 'var(--fmc-blue)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--fmc-text)', fontSize: 14 }}>
                      {run.name || `Run #${run.id}`}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fmc-text-muted)' }}>
                      {new Date(run.created_at).toLocaleString()}
                      {run.driver ? ` — Driver: ${run.driver}` : ''}
                      {run.practice_type ? ` — ${run.practice_type}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); exportCSV(run.id); }}
                    style={smallBtnStyle}
                  >
                    CSV
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); exportJSON(run.id); }}
                    style={smallBtnStyle}
                  >
                    JSON
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(run.id, run.name); }}
                    style={{ ...smallBtnStyle, background: 'var(--fmc-danger)', color: 'white' }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8,
                fontSize: 12, color: 'var(--fmc-text-muted)'
              }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fmc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Duration</div>
                  <div style={{ color: 'var(--fmc-text)', fontWeight: 600 }}>{run.duration_s.toFixed(1)}s</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fmc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Max Speed</div>
                  <div style={{ color: 'var(--fmc-blue)', fontWeight: 700 }}>{run.max_speed_ft_per_s.toFixed(1)} ft/s</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fmc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Avg Speed</div>
                  <div style={{ color: 'var(--fmc-text)', fontWeight: 600 }}>{run.avg_moving_speed_ft_per_s.toFixed(1)} ft/s</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fmc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Peak G</div>
                  <div style={{ color: 'var(--fmc-alert-orange)', fontWeight: 700 }}>{run.peak_estimated_g.toFixed(3)} g</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fmc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Distance</div>
                  <div style={{ color: 'var(--fmc-text)', fontWeight: 600 }}>{run.total_distance_ft.toFixed(1)} ft</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fmc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Moving</div>
                  <div style={{ color: 'var(--fmc-motion-green)', fontWeight: 700 }}>{run.time_moving_s.toFixed(1)}s</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fmc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Stopped</div>
                  <div style={{ color: 'var(--fmc-danger)', fontWeight: 700 }}>{run.time_stopped_s.toFixed(1)}s</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected.length >= 2 && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button onClick={handleCompare} style={{
            padding: '8px 24px', background: 'var(--fmc-blue)', color: 'white',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700,
            fontFamily: 'var(--fmc-font-ui)',
          }}>
            Compare {selected.length} Runs
          </button>
        </div>
      )}
    </div>
  );
}

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 8px', background: 'var(--fmc-border)', color: 'var(--fmc-text-muted)',
  border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11,
  fontWeight: 600, fontFamily: 'var(--fmc-font-ui)',
};
