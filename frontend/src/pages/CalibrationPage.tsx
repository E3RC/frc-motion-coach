import { useState, useEffect } from 'react';
import { api } from '../api/client';

type FieldType = 'full_field' | 'half_field' | 'custom';

export default function CalibrationPage() {
  const [step, setStep] = useState(1);
  const [cameras, setCameras] = useState<{ id: number; name: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState(0);
  const [fieldType, setFieldType] = useState<FieldType>('half_field');
  const [fieldWidth, setFieldWidth] = useState(27);
  const [fieldLength, setFieldLength] = useState(27);
  const [calName, setCalName] = useState('My Calibration');
  const [savedCals, setSavedCals] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.listCameras().then(setCameras).catch(() => {});
    api.getCalibrations().then(setSavedCals).catch(() => {});
  }, []);

  const handleFieldTypeChange = (t: FieldType) => {
    setFieldType(t);
    if (t === 'full_field') { setFieldWidth(54); setFieldLength(27); }
    else if (t === 'half_field') { setFieldWidth(27); setFieldLength(27); }
  };

  const handleSaveCalibration = async () => {
    setSaving(true);
    setMessage('');
    try {
      const imagePoints = [[100, 100], [300, 100], [300, 300], [100, 300]];
      const fieldPoints = [[0, 0], [fieldWidth, 0], [fieldWidth, fieldLength], [0, fieldLength]];
      const homography = [[1, 0, -100], [0, 1, -100], [0, 0, 1]];

      const res = await api.saveCalibration({
        name: calName,
        field_type: fieldType,
        field_width: fieldWidth,
        field_length: fieldLength,
        unit: 'feet',
        camera_resolution: `${selectedCamera}`,
        marker_points_image: imagePoints,
        marker_points_field: fieldPoints,
        homography_matrix: homography,
        notes: '',
      });
      setMessage(`Calibration saved with ID ${res.calibration_id}`);
      const cals = await api.getCalibrations();
      setSavedCals(cals);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 16px', color: 'var(--fmc-blue)', fontFamily: 'var(--fmc-font-display)', fontWeight: 700 }}>
          Calibration Wizard
        </h2>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['Select Camera', 'Field Setup', 'Calibrate', 'Save'].map((label, i) => (
            <div key={i} style={{
              flex: 1, padding: '8px 12px', borderRadius: 6,
              background: step >= i + 1 ? 'var(--fmc-blue)' : 'var(--fmc-bg)',
              color: step >= i + 1 ? 'white' : 'var(--fmc-text-muted)',
              fontSize: 12, textAlign: 'center', fontWeight: 700,
              letterSpacing: '0.5px',
            }}>
              {i + 1}. {label}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <h3 style={h3Style}>Select Camera</h3>
            <select
              value={selectedCamera}
              onChange={e => setSelectedCamera(Number(e.target.value))}
              style={selectStyle}
            >
              {cameras.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              {cameras.length === 0 && <option value={0}>Camera 0 (default)</option>}
            </select>
            <p style={{ fontSize: 12, color: 'var(--fmc-text-muted)', marginTop: 8 }}>
              {cameras.length > 0
                ? `${cameras.length} camera(s) detected`
                : 'No cameras detected. Will use default.'}
            </p>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button onClick={() => api.listCameras().then(setCameras)} style={btnSecondary}>
                Refresh Cameras
              </button>
              <button onClick={() => setStep(2)} style={btnPrimary}>Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 style={h3Style}>Field Setup</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {(['full_field', 'half_field', 'custom'] as FieldType[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleFieldTypeChange(t)}
                  style={{
                    ...btnToggle,
                    background: fieldType === t ? 'var(--fmc-blue)' : 'var(--fmc-bg)',
                    color: fieldType === t ? 'white' : 'var(--fmc-text)',
                    borderColor: fieldType === t ? 'var(--fmc-blue)' : 'var(--fmc-border)',
                  }}
                >
                  {t === 'full_field' ? 'Full Field' : t === 'half_field' ? 'Half Field' : 'Custom'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div>
                <label style={labelStyle}>Width (ft)</label>
                <input
                  type="number" value={fieldWidth}
                  onChange={e => setFieldWidth(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Length (ft)</label>
                <input
                  type="number" value={fieldLength}
                  onChange={e => setFieldLength(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ marginTop: 12, color: 'var(--fmc-text-muted)', fontSize: 12 }}>
              Standard FRC field: 54ft × 27ft. Half field: 27ft × 27ft.
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>Back</button>
              <button onClick={() => setStep(3)} style={btnPrimary}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 style={h3Style}>Calibration</h3>
            <div style={{
              background: 'var(--fmc-bg)', borderRadius: 8, padding: 24,
              textAlign: 'center', color: 'var(--fmc-text-muted)', marginBottom: 12,
              border: '1px dashed var(--fmc-border)',
            }}>
              <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.5 }}>🎯</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Place ArUco markers at field corners</div>
              <div style={{ fontSize: 12 }}>
                Or use manual corner selection in the camera feed
              </div>
            </div>
            <div style={{
              background: 'var(--fmc-bg)', borderRadius: 8, padding: 16,
              border: '1px solid var(--fmc-border)', marginBottom: 12
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fmc-text)', marginBottom: 8 }}>
                Calibration Preview
              </div>
              <div style={{
                width: '100%', height: 200, background: '#0D1A14',
                borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--fmc-text-muted)', fontSize: 12
              }}>
                Top-down field preview will appear here
              </div>
              <div style={{
                display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--fmc-text-muted)'
              }}>
                <div>Width: {fieldWidth} ft</div>
                <div>Length: {fieldLength} ft</div>
                <div>Reprojection error: —</div>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(2)} style={btnSecondary}>Back</button>
              <button onClick={() => setStep(4)} style={btnPrimary}>Next</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 style={h3Style}>Save Calibration Profile</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Profile Name</label>
              <input
                value={calName}
                onChange={e => setCalName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{
              background: 'var(--fmc-bg)', borderRadius: 8, padding: 16, marginBottom: 12,
              fontSize: 13, color: 'var(--fmc-text-muted)'
            }}>
              <div>Field: {fieldType.replace('_', ' ')} ({fieldWidth}×{fieldLength} ft)</div>
              <div>Camera: Camera {selectedCamera}</div>
              <div>Points: 4 corners</div>
            </div>
            {message && (
              <div style={{
                padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13,
                fontWeight: 600,
                background: message.startsWith('Error') ? '#2A0A0A' : '#0A2A10',
                color: message.startsWith('Error') ? '#FF6B6B' : '#22A83A',
              }}>
                {message}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(3)} style={btnSecondary}>Back</button>
              <button onClick={handleSaveCalibration} disabled={saving} style={btnPrimary}>
                {saving ? 'Saving...' : 'Save Calibration'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>Saved Calibration Profiles</h3>
        {savedCals.length === 0 ? (
          <div style={{ color: 'var(--fmc-text-muted)', fontSize: 13 }}>No saved calibrations yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedCals.map(c => (
              <div key={c.id} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--fmc-bg)', borderRadius: 6,
                fontSize: 13
              }}>
                <div>
                  <strong style={{ color: 'var(--fmc-text)' }}>{c.name}</strong>
                  <span style={{ color: 'var(--fmc-text-muted)', marginLeft: 8 }}>
                    {c.field_type.replace('_', ' ')} — {c.field_width}×{c.field_length} ft
                  </span>
                </div>
                <div style={{ color: 'var(--fmc-text-muted)', fontSize: 11 }}>
                  {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--fmc-surface)', borderRadius: 12, padding: 20,
  border: '1px solid var(--fmc-border)', marginBottom: 16,
};

const h3Style: React.CSSProperties = {
  margin: '0 0 12px 0', fontSize: 12, color: 'var(--fmc-text-muted)',
  textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700,
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px', background: 'var(--fmc-blue)', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)',
};

const btnSecondary: React.CSSProperties = {
  padding: '8px 20px', background: 'var(--fmc-border)', color: 'var(--fmc-text)',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)',
};

const btnToggle: React.CSSProperties = {
  padding: '6px 16px', border: '1px solid var(--fmc-border)', borderRadius: 6,
  cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'var(--fmc-font-ui)',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, border: '1px solid var(--fmc-border)',
  background: 'var(--fmc-bg)', color: 'var(--fmc-text)', fontSize: 13,
  width: '100%', fontFamily: 'var(--fmc-font-ui)',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, border: '1px solid var(--fmc-border)',
  background: 'var(--fmc-bg)', color: 'var(--fmc-text)', fontSize: 13,
  width: '100%', boxSizing: 'border-box', fontFamily: 'var(--fmc-font-ui)',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, color: 'var(--fmc-text-muted)', marginBottom: 4,
};
