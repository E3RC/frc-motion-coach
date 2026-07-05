import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import CalibrationPage from './pages/CalibrationPage';
import HistoryPage from './pages/HistoryPage';
import RunReviewPage from './pages/RunReviewPage';
import SettingsPage from './pages/SettingsPage';
import CompareRunsPage from './pages/CompareRunsPage';
import SplashScreen from './components/SplashScreen';

export default function App() {
  const location = useLocation();

  return (
    <>
      <SplashScreen />
      <div style={{
      minHeight: '100vh',
      background: 'var(--fmc-bg)',
      color: 'var(--fmc-text)',
      fontFamily: 'var(--fmc-font-ui)',
    }}>
      <nav style={{
        display: 'flex', gap: 0, padding: '0 24px',
        background: 'var(--fmc-surface)',
        borderBottom: '1px solid var(--fmc-border)',
        alignItems: 'stretch', height: 56,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          marginRight: 32,
        }}>
          <img
            src="/frc-motion-coach.svg"
            alt="FRC Motion Coach"
            style={{ height: 40, width: 'auto' }}
          />
        </div>
        <NavLink to="/" style={linkStyle} end>
          LIVE
        </NavLink>
        <NavLink to="/calibration" style={linkStyle}>
          CALIBRATE
        </NavLink>
        <NavLink to="/history" style={linkStyle}>
          RUNS
        </NavLink>
        <NavLink to="/settings" style={linkStyle}>
          SETTINGS
        </NavLink>
      </nav>
      <main style={{ padding: 24 }}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calibration" element={<CalibrationPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/runs/:id" element={<RunReviewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/compare" element={<CompareRunsPage />} />
        </Routes>
      </main>
    </div>
    </>
  );
}

const activeStyle = {
  color: 'var(--fmc-blue)',
  borderBottom: '3px solid var(--fmc-blue)',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--fmc-text-muted)',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '2px',
  padding: '0 20px',
  display: 'flex',
  alignItems: 'center',
  borderBottom: '3px solid transparent',
  transition: 'color 0.15s, border-color 0.15s',
};
