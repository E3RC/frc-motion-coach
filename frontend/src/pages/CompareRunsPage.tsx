import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, RunSummary, TrackingSample } from '../api/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line } from 'recharts';
import FieldOverlay from '../field/FieldOverlay';

const COLORS = ['#0057D9', '#FF7A00', '#22A83A', '#D62828', '#8A2BE2'];

export default function CompareRunsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = (searchParams.get('ids') || '').split(',').map(Number).filter(Boolean);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [samplesMap, setSamplesMap] = useState<Record<number, TrackingSample[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) return;
    Promise.all([
      ...ids.map(id => api.getRun(id).catch(() => null)),
      ...ids.map(id => api.getSamples(id).catch(() => [])),
      api.getRuns(),
    ]).then((results) => {
      const runDetails = results.slice(0, ids.length) as any[];
      const allSamples = results.slice(ids.length, ids.length * 2) as TrackingSample[][];
      const allRuns = results[results.length - 1] as RunSummary[];
      const sm: Record<number, TrackingSample[]> = {};
      ids.forEach((id, i) => {
        if (allSamples[i]) sm[id] = allSamples[i];
      });
      setSamplesMap(sm);
      setRuns(allRuns.filter(r => ids.includes(r.id)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [ids.join(',')]);

  if (loading) {
    return <div style={{ color: 'var(--fmc-text-muted)' }}>Loading comparison...</div>;
  }

  if (runs.length < 2) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', padding: 40 }}>
        <div style={{ color: 'var(--fmc-text-muted)', marginBottom: 16 }}>
          Select at least 2 runs to compare.
        </div>
        <button onClick={() => navigate('/history')} style={btnSecondary}>
          ← Back to Runs
        </button>
      </div>
    );
  }

  const combinedChartData: Record<string, any>[] = [];
  const maxLen = Math.max(...Object.values(samplesMap).map(s => s.length));
  for (let i = 0; i < maxLen; i++) {
    const point: Record<string, any> = { index: i };
    runs.forEach((run) => {
      const s = samplesMap[run.id];
      if (s && s[i]) {
        point[`speed_${run.id}`] = Number(s[i].speed.toFixed(2));
        point[`accel_${run.id}`] = Number(s[i].acceleration.toFixed(2));
        point[`g_${run.id}`] = Number(s[i].estimated_g.toFixed(4));
      }
    });
    combinedChartData.push(point);
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <button onClick={() => navigate('/history')} style={{
        padding: '6px 14px', background: 'var(--fmc-border)', color: 'var(--fmc-text)',
        border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
        fontWeight: 600, fontFamily: 'var(--fmc-font-ui)', marginBottom: 16
      }}>
        ← Back to Runs
      </button>

      <div style={cardStyle}>
        <h2 style={{
          margin: '0 0 16px', color: 'var(--fmc-text)',
          fontFamily: 'var(--fmc-font-display)', fontWeight: 700,
        }}>
          Compare Runs
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>Metric</th>
                {runs.map((run, i) => (
                  <th key={run.id} style={{ ...thStyle, color: COLORS[i % COLORS.length] }}>
                    {run.name || `Run #${run.id}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Duration', key: 'duration_s', unit: 's', decimals: 1 },
                { label: 'Max Speed', key: 'max_speed_ft_per_s', unit: 'ft/s', decimals: 1 },
                { label: 'Avg Speed', key: 'avg_moving_speed_ft_per_s', unit: 'ft/s', decimals: 1 },
                { label: 'Peak G', key: 'peak_estimated_g', unit: 'g', decimals: 3 },
                { label: 'Distance', key: 'total_distance_ft', unit: 'ft', decimals: 1 },
                { label: 'Time Moving', key: 'time_moving_s', unit: 's', decimals: 1 },
                { label: 'Time Stopped', key: 'time_stopped_s', unit: 's', decimals: 1 },
                { label: 'Samples', key: 'sample_count', unit: '', decimals: 0 },
              ].map(row => (
                <tr key={row.key}>
                  <td style={tdStyle}>{row.label}</td>
                  {runs.map((run, i) => (
                    <td key={run.id} style={{ ...tdStyle, color: COLORS[i % COLORS.length], fontWeight: 700 }}>
                      {(run as any)[row.key]?.toFixed(row.decimals) ?? '-'}{row.unit ? ` ${row.unit}` : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(runs.length, 3)}, 1fr)`, gap: 16, marginBottom: 16 }}>
        {runs.map((run, i) => (
          <div key={run.id} style={cardStyle}>
            <h3 style={{
              margin: '0 0 8px', fontSize: 12, color: COLORS[i % COLORS.length],
              textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700,
            }}>
              {run.name || `Run #${run.id}`}
            </h3>
            <FieldOverlay
              path={samplesMap[run.id]?.map(s => ({ x: s.field_x, y: s.field_y })) || []}
              currentPos={null}
              width={27}
              height={27}
            />
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>Speed Over Time</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={combinedChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" />
            <XAxis dataKey="index" tick={{ fill: '#8D98A6', fontSize: 10 }} label={{ value: 'Frame', fill: '#8D98A6', fontSize: 10 }} />
            <YAxis tick={{ fill: '#8D98A6', fontSize: 10 }} unit=" ft/s" />
            <Tooltip
              contentStyle={{ background: '#1B2733', border: '1px solid #2A3A4A', borderRadius: 6 }}
              labelStyle={{ color: '#8D98A6' }}
            />
            <Legend />
            {runs.map((run, i) => (
              <Area
                key={run.id}
                type="monotone"
                dataKey={`speed_${run.id}`}
                name={run.name || `Run #${run.id}`}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.05}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>Acceleration Over Time</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={combinedChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" />
            <XAxis dataKey="index" tick={{ fill: '#8D98A6', fontSize: 10 }} />
            <YAxis tick={{ fill: '#8D98A6', fontSize: 10 }} unit=" ft/s²" />
            <Tooltip
              contentStyle={{ background: '#1B2733', border: '1px solid #2A3A4A', borderRadius: 6 }}
              labelStyle={{ color: '#8D98A6' }}
            />
            <Legend />
            {runs.map((run, i) => (
              <Area
                key={run.id}
                type="monotone"
                dataKey={`accel_${run.id}`}
                name={run.name || `Run #${run.id}`}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.05}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>Estimated G-Force</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={combinedChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" />
            <XAxis dataKey="index" tick={{ fill: '#8D98A6', fontSize: 10 }} />
            <YAxis tick={{ fill: '#8D98A6', fontSize: 10 }} unit=" g" />
            <Tooltip
              contentStyle={{ background: '#1B2733', border: '1px solid #2A3A4A', borderRadius: 6 }}
              labelStyle={{ color: '#8D98A6' }}
            />
            <Legend />
            {runs.map((run, i) => (
              <Area
                key={run.id}
                type="monotone"
                dataKey={`g_${run.id}`}
                name={run.name || `Run #${run.id}`}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.05}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--fmc-surface)', borderRadius: 12, padding: 16,
  border: '1px solid var(--fmc-border)', marginBottom: 16,
};

const h3Style: React.CSSProperties = {
  margin: '0 0 12px', fontSize: 12, color: 'var(--fmc-text-muted)',
  textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--fmc-border)',
  color: 'var(--fmc-text-muted)', fontSize: 11, textTransform: 'uppercase',
  letterSpacing: '1px', fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px', borderBottom: '1px solid var(--fmc-border)',
  color: 'var(--fmc-text)', fontSize: 13,
};

const btnSecondary: React.CSSProperties = {
  padding: '8px 20px', background: 'var(--fmc-border)', color: 'var(--fmc-text)',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)',
};
