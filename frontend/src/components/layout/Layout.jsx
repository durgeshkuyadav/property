import { useState, useCallback, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageKey, setPageKey] = useState(0);
  const location = useLocation();

  const toggle = useCallback(() => setSidebarOpen(o => !o), []);
  const close  = useCallback(() => setSidebarOpen(false), []);

  // Trigger re-animation on route change + close sidebar on mobile nav
  useEffect(() => {
    setPageKey(k => k + 1);
    close();
  }, [location.pathname]);

  return (
    <>
      {/* Moving gradient background */}
      <div className="layout-bg" />

      <div className="layout">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            onClick={close}
            style={{
              position:'fixed', inset:0, zIndex:150,
              background:'rgba(15,23,42,0.45)',
              backdropFilter:'blur(3px)',
              animation:'fadeOverlay .2s ease',
            }}
          />
        )}

        <Sidebar isOpen={sidebarOpen} onClose={close} />

        <div className="main-content" style={{ marginLeft:'var(--sb-w)' }}>
          <div key={pageKey} className="page-enter" style={{ display:'flex', flexDirection:'column', flex:1, height:'100%', overflow:'hidden' }}>
            <Outlet context={{ toggleSidebar: toggle }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeOverlay { from{opacity:0} to{opacity:1} }
        @media (max-width: 768px) {
          .main-content { margin-left: 0 !important; }
        }
      `}</style>
    </>
  );
}
