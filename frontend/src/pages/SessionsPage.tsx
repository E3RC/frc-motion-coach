import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, SessionSummary } from '../api/client';

export default function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', practice_type: 'Driver Practice', driver: '', robot_config: '', team: '', notes: '', session_date: '' });

  const load = () => {
    setLoading(true);
    api.getSessions().then(s => { setSessions(s); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(load, []);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      await api.createSession(form);
      setShowCreate(false);
      setForm({ name: '', practice_type: 'Driver Practice', driver: '', robot_config: '', team: '', notes: '', session_date: '' });
      load();
    } catch (err) {
      console.error('Failed to create session', err);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete session "${name}"? Runs will be unlinked but not deleted.`)) return;
    try {
      await api.deleteSession(id);
      load();
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: 'var(--fmc-text)', fontFamily: 'var(--fmc-font-display)', fontWeight: 700 }}>
            Practice Sessions
          </h2>
          <button onClick={() => setShowCreate(true)} style={btnPrimary}>
            + New Session
          </button>
        </div>

        {showCreate && (
          <div style={{ background: 'var(--fmc-bg)', borderRadius: 8, padding: 16, marginBottom: 16, border: '1px solid var(--fmc-border)' }}>
            <h3 style={h3Style}>Create Session</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Session name *" value={form.name} onChange={e => set('name', e.target.value)} style={{ ...inputStyle, flex: 2 }} />
                <input placeholder="Date (YYYY-MM-DD)" value={form.session_date} onChange={e => set('session_date', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={form.practice_type} onChange={e => set('practice_type', e.target.value)} style={selectStyle}>
                  <option>Driver Practice</option>
                  <option>Auto Routine</option>
                  <option>Swerve Tuning</option>
                  <option>Path Following</option>
                  <option>Free Practice</option>
                </select>
                <input placeholder="Driver" value={form.driver} onChange={e => set('driver', e.target.value)} style={inputStyle} />
                <input placeholder="Robot Config" value={form.robot_config} onChange={e => set('robot_config', e.target.value)} style={inputStyle} />
                <input placeholder="Team" value={form.team} onChange={e => set('team', e.target.value)} style={inputStyle} />
              </div>
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' as any }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCreate} style={btnPrimary}>Save Session</button>
                <button onClick={() => setShowCreate(false)} style={btnSecondary}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ color: 'var(--fmc-text-muted)' }}>Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--fmc-text-muted)' }}>
            <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 600 }}>No sessions yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Create a session to group related practice runs.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map(s => (
              <div key={s.id} style={{
                background: 'var(--fmc-surface)', borderRadius: 10, padding: 16,
                border: '1px solid var(--fmc-border)', cursor: 'pointer',
              }} onClick={() => navigate(`/history?session=${s.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--fmc-text)', fontSize: 14 }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fmc-text-muted)', marginTop: 2 }}>
                      {s.session_date || new Date(s.created_at).toLocaleDateString()}
                      {s.driver ? ` — Driver: ${s.driver}` : ''}
                      {s.practice_type ? ` — ${s.practice_type}` : ''}
                      {s.team ? ` — Team: ${s.team}` : ''}
                    </div>
                    {s.notes && (
                      <div style={{ fontSize: 11, color: 'var(--fmc-text-muted)', marginTop: 4, maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--fmc-blue)', fontWeight: 700 }}>
                      {s.run_count} run{s.run_count !== 1 ? 's' : ''}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id, s.name); }} style={smallDangerBtn}>
                      Delete
                    </button>
                  </div>
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
  border: '1px solid var(--fmc-border)',
};

const h3Style: React.CSSProperties = {
  margin: '0 0 12px', fontSize: 12, color: 'var(--fmc-text-muted)',
  textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700,
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 18px', background: 'var(--fmc-blue)', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)',
};

const btnSecondary: React.CSSProperties = {
  padding: '8px 18px', background: 'var(--fmc-border)', color: 'var(--fmc-text)',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)',
};

const smallDangerBtn: React.CSSProperties = {
  padding: '4px 8px', background: 'var(--fmc-danger)', color: 'white',
  border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600,
  fontFamily: 'var(--fmc-font-ui)',
};

const selectStyle: React.CSSProperties = {
  padding: '7px 10px', borderRadius: 6, border: '1px solid var(--fmc-border)',
  background: 'var(--fmc-bg)', color: 'var(--fmc-text)', fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)', flex: 1,
};

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', borderRadius: 6, border: '1px solid var(--fmc-border)',
  background: 'var(--fmc-bg)', color: 'var(--fmc-text)', fontSize: 13,
  fontFamily: 'var(--fmc-font-ui)', boxSizing: 'border-box',
};
