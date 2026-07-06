import { useState, useEffect, useRef } from 'react';
import { api, RunSummary } from '../api/client';

export default function HeatmapPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunIds, setSelectedRunIds] = useState<number[]>([]);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getRuns().then(setRuns).catch(() => {});
  }, []);

  const toggleRun = (id: number) => {
    setSelectedRunIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const generateHeatmap = async () => {
    setLoading(true);
    try {
      const ids = selectedRunIds.join(',');
      const data = await api.getHeatmap(ids || undefined);
      setHeatmap(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!heatmap || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(canvas.clientWidth, 500);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const grid = heatmap.grid;
    const gs = heatmap.grid_size;
    if (!grid || grid.length === 0) return;

    const cellSize = size / gs;
    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.fillStyle = '#0D1A14';
    ctx.fillRect(0, 0, size, size);

    // Draw heatmap cells
    for (let y = 0; y < gs; y++) {
      for (let x = 0; x < gs; x++) {
        if (y < grid.length && x < grid[y].length) {
          const val = grid[y][x] / 255;
          if (val > 0.02) {
            const r = Math.round(0 + val * 255);
            const g = Math.round(122 * (1 - val));
            const b = Math.round(0);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${val * 0.7})`;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize + 0.5, cellSize + 0.5);
          }
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = '#1A3A28';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gs; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(size, i * cellSize);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#2A5A3A';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);

    // Labels
    ctx.fillStyle = '#4A8A6A';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(`${heatmap.field_width ?? '54'}'`, size / 2 - 6, size - 4);
    ctx.save();
    ctx.translate(8, size / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${heatmap.field_length ?? '27'}'`, -6, 3);
    ctx.restore();

  }, [heatmap]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={cardStyle}>
        <h2 style={{
          margin: '0 0 16px', color: 'var(--fmc-text)',
          fontFamily: 'var(--fmc-font-display)', fontWeight: 700,
        }}>
          Position Heatmap
        </h2>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--fmc-text-muted)', marginBottom: 8 }}>
            Select runs to include in the heatmap:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {runs.map(run => (
              <button
                key={run.id}
                onClick={() => toggleRun(run.id)}
                style={{
                  padding: '4px 10px', borderRadius: 4, fontSize: 11,
                  fontFamily: 'var(--fmc-font-ui)',
                  background: selectedRunIds.includes(run.id) ? 'var(--fmc-blue)' : 'var(--fmc-surface)',
                  color: selectedRunIds.includes(run.id) ? 'white' : 'var(--fmc-text)',
                  border: '1px solid var(--fmc-border)',
                  cursor: 'pointer',
                }}
              >
                {run.name || `Run #${run.id}`}
              </button>
            ))}
            {runs.length === 0 && (
              <span style={{ color: 'var(--fmc-text-muted)', fontSize: 13 }}>No runs available</span>
            )}
          </div>
        </div>

        <button onClick={generateHeatmap} disabled={loading} style={btnPrimary}>
          {loading ? 'Generating...' : 'Generate Heatmap'}
        </button>

        {heatmap && (
          <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 12, color: 'var(--fmc-text-muted)' }}>
            <span>Samples: {heatmap.total_samples}</span>
            <span>Max density: {heatmap.max_count}</span>
            <span>Field: {heatmap.field_width?.toFixed(1)} × {heatmap.field_length?.toFixed(1)} ft</span>
          </div>
        )}
      </div>

      {heatmap && (
        <div style={cardStyle}>
          <h3 style={h3Style}>Heatmap Visualization</h3>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: 500, aspectRatio: '1' }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginTop: 12,
            fontSize: 11, color: 'var(--fmc-text-muted)', justifyContent: 'center',
          }}>
            <span style={{ color: '#003300' }}>■</span> Low
            <span style={{ color: '#007700' }}>■</span>
            <span style={{ color: '#00CC00' }}>■</span>
            <span style={{ color: '#88FF00' }}>■</span>
            <span style={{ color: '#FFAA00' }}>■</span>
            <span style={{ color: '#FF0000' }}>■</span> High
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--fmc-surface)', borderRadius: 12, padding: 20,
  border: '1px solid var(--fmc-border)', marginBottom: 16,
};

const h3Style: React.CSSProperties = {
  margin: '0 0 12px', fontSize: 12, color: 'var(--fmc-text-muted)',
  textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700,
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px', background: 'var(--fmc-blue)', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)',
};
