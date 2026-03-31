import { useEffect, useState } from 'react';

const LoadingScreen = ({ stages = ['Loading...'], active = true }) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    if (!active || stages.length <= 1) return;
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentStage((prev) => (prev + 1 < stages.length ? prev + 1 : prev));
        setFadeIn(true);
      }, 400);
    }, 2000);
    return () => clearInterval(interval);
  }, [active, stages.length]);

  if (!active) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Animated dots */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '32px' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: 'var(--emerald-500)',
              animation: `pptDotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Stage text */}
      <p
        style={{
          color: '#f0ede6',
          fontSize: '1.1rem',
          letterSpacing: '0.04em',
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 0.4s ease',
          textAlign: 'center',
          maxWidth: '420px',
          padding: '0 24px',
        }}
      >
        {stages[currentStage]}
      </p>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '32px' }}>
        {stages.map((_, i) => (
          <div
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: i === currentStage ? 'var(--emerald-500)' : '#333',
              transition: 'background-color 0.3s',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pptDotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
