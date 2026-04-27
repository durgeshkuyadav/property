import { useOutletContext } from 'react-router-dom';

export default function Topbar({ title, subtitle, children }) {
  let toggleSidebar;
  try {
    const ctx = useOutletContext();
    toggleSidebar = ctx?.toggleSidebar;
  } catch {}

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', height: 60, minHeight: 60,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(148,163,184,0.15)',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 0 rgba(148,163,184,0.1)',
    }}>
      {/* Left: hamburger + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
        {/* Hamburger — visible only on mobile */}
        <button
          onClick={toggleSidebar}
          aria-label="Toggle menu"
          style={{
            display: 'none', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(148,163,184,0.3)',
            background: 'transparent', cursor: 'pointer', color: '#334155',
            flexShrink: 0,
          }}
          className="hamburger-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 16, fontWeight: 700, color: '#0F172A',
            letterSpacing: '-0.3px', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Right: children or date pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {children || (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#EEF2FF', color: '#4F46E5',
            padding: '5px 11px', borderRadius: 99,
            fontSize: 10.5, fontWeight: 600, letterSpacing: '0.02em',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8"  y1="2" x2="8"  y2="6"/>
              <line x1="3"  y1="10" x2="21" y2="10"/>
            </svg>
            {today}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hamburger-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
