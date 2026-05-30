import { useState, useEffect } from 'react';

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 4500);
    const removeTimer = setTimeout(() => setVisible(false), 5000);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  if (!visible) return null;

  const fadeStyle = fading ? { opacity: 0, transition: 'opacity 0.5s ease-out' } : {};

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#101820',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
      animation: 'fadeIn 0.3s ease-out',
      ...fadeStyle,
    }}>
      <img
        src="/frc-motion-coach.svg"
        alt="FRC Motion Coach"
        style={{ width: '80%', maxWidth: 600, height: 'auto' }}
      />
      <div style={{
        fontFamily: '"Inter", system-ui, sans-serif',
        fontSize: 14, color: '#8D98A6',
        letterSpacing: '4px', textTransform: 'uppercase',
      }}>
        Track · Analyze · Improve
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
