import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function SettingsPage() {
  const [cameras, setCameras] = useState<{ id: number; name: string }[]>([]);
  const [orig, setOrig] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      api.listCameras().catch(() => []),
      api.getSettings(),
    ]).then(([cams, s]) => {
      setCameras(cams as any);
      setOrig(s);
      setForm({ ...s });
    });
  }, []);

  const set = (key: string, value: any) =>
    setForm((f: any) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const changed: any = {};
      for (const key of Object.keys(form)) {
        if (form[key] !== orig[key]) {
          changed[key] = form[key];
        }
      }
      if (Object.keys(changed).length === 0) {
        setMessage('No changes to save.');
        setSaving(false);
        return;
      }
      const res = await api.updateSettings(changed);
      if (res.status === 'ok') {
        setMessage('Settings saved!');
        const s = await api.getSettings();
        setOrig(s);
        setForm({ ...s });
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
    setSaving(false);
  };

  if (!orig) {
    return <div style={{ color: 'var(--fmc-text-muted)' }}>Loading settings...</div>;
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={cardStyle}>
        <h2 style={{
          margin: '0 0 16px', color: 'var(--fmc-text)',
          fontFamily: 'var(--fmc-font-display)', fontWeight: 700,
        }}>
          Settings
        </h2>

        <Section title="Camera">
          <Row>
            <Label>Camera Device</Label>
            <select value={form.camera_id} onChange={e => set('camera_id', Number(e.target.value))} style={selectStyle}>
              {cameras.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              {cameras.length === 0 && <option value={form.camera_id}>Camera {form.camera_id}</option>}
            </select>
          </Row>
          <Row>
            <Label>Resolution</Label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={form.camera_resolution_width} onChange={e => set('camera_resolution_width', Number(e.target.value))} style={smallInputStyle} />
              <span style={{ color: 'var(--fmc-text-muted)' }}>×</span>
              <input type="number" value={form.camera_resolution_height} onChange={e => set('camera_resolution_height', Number(e.target.value))} style={smallInputStyle} />
            </div>
          </Row>
        </Section>

        <Section title="Tracking">
          <Row>
            <Label>Mode</Label>
            <select value={form.tracking_mode} onChange={e => set('tracking_mode', e.target.value)} style={selectStyle}>
              <option value="aruco">ArUco Marker</option>
              <option value="color">Color Tracking</option>
              <option value="yolo">YOLO (ML Detection)</option>
            </select>
          </Row>
          <Row>
            <Label>Target Marker IDs (comma-separated)</Label>
            <input type="text" value={form.target_marker_ids || '0'} onChange={e => set('target_marker_ids', e.target.value)} style={inputStyle} />
          </Row>
          <Row>
            <Label>Target Marker ID</Label>
            <input type="number" value={form.target_marker_id} onChange={e => set('target_marker_id', Number(e.target.value))} style={inputStyle} />
          </Row>
          <Row>
            <Label>YOLO Model Path</Label>
            <input type="text" value={form.yolo_model_path || 'yolov8n.pt'} onChange={e => set('yolo_model_path', e.target.value)} style={inputStyle} />
          </Row>
          <Row>
            <Label>Marker Offset X (ft)</Label>
            <input type="number" step="0.1" value={form.marker_offset_x} onChange={e => set('marker_offset_x', Number(e.target.value))} style={inputStyle} />
          </Row>
          <Row>
            <Label>Marker Offset Y (ft)</Label>
            <input type="number" step="0.1" value={form.marker_offset_y} onChange={e => set('marker_offset_y', Number(e.target.value))} style={inputStyle} />
          </Row>
          <Row>
            <Label>Lost Timeout (s)</Label>
            <input type="number" step="0.1" value={form.tracking_lost_timeout_s} onChange={e => set('tracking_lost_timeout_s', Number(e.target.value))} style={inputStyle} />
          </Row>
        </Section>

        <Section title="Motion Thresholds">
          <Row>
            <Label>Moving Threshold (ft/s)</Label>
            <input type="number" step="0.05" value={form.moving_threshold_ft_per_s} onChange={e => set('moving_threshold_ft_per_s', Number(e.target.value))} style={inputStyle} />
          </Row>
          <Row>
            <Label>Moving Min Duration (s)</Label>
            <input type="number" step="0.05" value={form.moving_min_duration_s} onChange={e => set('moving_min_duration_s', Number(e.target.value))} style={inputStyle} />
          </Row>
          <Row>
            <Label>Stopped Threshold (ft/s)</Label>
            <input type="number" step="0.05" value={form.stopped_threshold_ft_per_s} onChange={e => set('stopped_threshold_ft_per_s', Number(e.target.value))} style={inputStyle} />
          </Row>
          <Row>
            <Label>Stopped Min Duration (s)</Label>
            <input type="number" step="0.05" value={form.stopped_min_duration_s} onChange={e => set('stopped_min_duration_s', Number(e.target.value))} style={inputStyle} />
          </Row>
          <Row>
            <Label>Smoothing Window</Label>
            <input type="number" value={form.smoothing_window} onChange={e => set('smoothing_window', Number(e.target.value))} style={inputStyle} />
          </Row>
        </Section>

        <Section title="NetworkTables (Robot Telemetry)">
          <Row>
            <Label>Enabled</Label>
            <input type="checkbox" checked={!!form.networktables_enabled} onChange={e => set('networktables_enabled', e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--fmc-blue)' }} />
          </Row>
          <Row>
            <Label>Server Address</Label>
            <input type="text" value={form.networktables_server || '10.15.55.2'} onChange={e => set('networktables_server', e.target.value)} style={inputStyle} />
          </Row>
          <Row>
            <Label>Port</Label>
            <input type="number" value={form.networktables_port || 5810} onChange={e => set('networktables_port', Number(e.target.value))} style={inputStyle} />
          </Row>
        </Section>

        <Section title="Color Tracking (HSV Range)">
          <Row>
            <Label>Hue Lower</Label>
            <input type="number" min={0} max={179} value={form.color_lower_h} onChange={e => set('color_lower_h', Number(e.target.value))} style={smallInputStyle} />
          </Row>
          <Row>
            <Label>Hue Upper</Label>
            <input type="number" min={0} max={179} value={form.color_upper_h} onChange={e => set('color_upper_h', Number(e.target.value))} style={smallInputStyle} />
          </Row>
          <Row>
            <Label>Sat Lower</Label>
            <input type="number" min={0} max={255} value={form.color_lower_s} onChange={e => set('color_lower_s', Number(e.target.value))} style={smallInputStyle} />
          </Row>
          <Row>
            <Label>Sat Upper</Label>
            <input type="number" min={0} max={255} value={form.color_upper_s} onChange={e => set('color_upper_s', Number(e.target.value))} style={smallInputStyle} />
          </Row>
          <Row>
            <Label>Val Lower</Label>
            <input type="number" min={0} max={255} value={form.color_lower_v} onChange={e => set('color_lower_v', Number(e.target.value))} style={smallInputStyle} />
          </Row>
          <Row>
            <Label>Val Upper</Label>
            <input type="number" min={0} max={255} value={form.color_upper_v} onChange={e => set('color_upper_v', Number(e.target.value))} style={smallInputStyle} />
          </Row>
        </Section>

        {message && (
          <div style={{
            padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13,
            fontWeight: 600,
            background: message.startsWith('Error') ? '#2A0A0A' : message.startsWith('No changes') ? '#1A1A0A' : '#0A2A10',
            color: message.startsWith('Error') ? '#FF6B6B' : message.startsWith('No changes') ? '#FFC107' : '#22A83A',
          }}>
            {message}
          </div>
        )}

        <button onClick={handleSave} disabled={saving} style={btnPrimary}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{
        margin: '0 0 10px', fontSize: 12, color: 'var(--fmc-blue)',
        textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700,
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', gap: 16,
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, color: 'var(--fmc-text)', minWidth: 180 }}>{children}</div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--fmc-surface)', borderRadius: 12, padding: 20,
  border: '1px solid var(--fmc-border)',
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px', background: 'var(--fmc-blue)', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--fmc-border)',
  background: 'var(--fmc-bg)', color: 'var(--fmc-text)', fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)', minWidth: 180,
};

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--fmc-border)',
  background: 'var(--fmc-bg)', color: 'var(--fmc-text)', fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)', minWidth: 180, boxSizing: 'border-box',
};

const smallInputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--fmc-border)',
  background: 'var(--fmc-bg)', color: 'var(--fmc-text)', fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)', width: 80, boxSizing: 'border-box',
};
