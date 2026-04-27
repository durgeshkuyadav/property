import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SVG = ({ d, size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

/* ── Icon paths ─────────────────────────────────────────────── */
const ICONS = {
  dashboard:   <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  customers:   <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
  monthly:     <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  projects:    <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  plot:        <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>,
  payout:      <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
  payments:    <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  teampayout:  <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
  tree:        <><circle cx="12" cy="5" r="3"/><path d="M12 8v13"/><path d="M5 21v-3a7 7 0 0114 0v3"/></>,
  downline:    <><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>,
  associates:  <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  manage:      <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
  approve:     <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  profile:     <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  letter:      <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
  password:    <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
  logout:      <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
};

const NAV = [
  { section:'OVERVIEW', items:[
    { to:'/', label:'Dashboard', icon:'dashboard' },
  ]},
  { section:'BUSINESS', items:[
    { to:'/customers',        label:'Customers',      icon:'customers' },
    { to:'/monthly-business', label:'Monthly Report', icon:'monthly' },
  ]},
  { section:'INVENTORY', items:[
    { to:'/projects',    label:'Projects',    icon:'projects' },
    { to:'/plot-status', label:'Plot Status', icon:'plot' },
  ]},
  { section:'EARNINGS', items:[
    { to:'/payout-detail', label:'Payout Detail',  icon:'payout' },
    { to:'/payments',      label:'Bank Payments',  icon:'payments' },
    { to:'/team-payout',   label:'Team Payout',    icon:'teampayout' },
  ]},
  { section:'NETWORK', items:[
    { to:'/referral-tree', label:'Referral Tree', icon:'tree' },
    { to:'/downline',      label:'My Team',        icon:'downline' },
  ]},
];
const ADMIN_SECTION = { section:'ADMIN', items:[
  { to:'/admin/associates', label:'Associates',        icon:'associates' },
  { to:'/admin/projects',   label:'Manage Projects',   icon:'manage' },
  { to:'/admin/payouts',    label:'Payout Processing', icon:'approve' },
]};
const ACCOUNT_SECTION = { section:'ACCOUNT', items:[
  { to:'/profile',         label:'My Profile',      icon:'profile' },
  { to:'/welcome-letter',  label:'Welcome Letter',  icon:'letter' },
  { to:'/change-password', label:'Change Password', icon:'password' },
]};

function NavItem({ to, label, icon, onClose }) {
  return (
    <NavLink to={to} end={to==='/'} onClick={onClose}
      style={{ textDecoration:'none', display:'block', marginBottom:1 }}>
      {({ isActive }) => (
        <div style={{
          display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
          borderRadius:9, cursor:'pointer', position:'relative',
          background: isActive ? 'rgba(99,102,241,0.14)' : 'transparent',
          color: isActive ? '#6366F1' : '#94A3B8',
          fontSize:12.5, fontWeight: isActive ? 700 : 400,
          transition:'all 0.14s ease',
        }}
          onMouseOver={e => { if(!isActive){ e.currentTarget.style.background='rgba(148,163,184,0.08)'; e.currentTarget.style.color='#CBD5E1'; } }}
          onMouseOut={e => { if(!isActive){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94A3B8'; } }}
        >
          {isActive && (
            <span style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', width:3, height:16, background:'#6366F1', borderRadius:99 }} />
          )}
          <span style={{ display:'flex', flexShrink:0, color: isActive ? '#6366F1' : '#64748B' }}>
            <SVG d={ICONS[icon]} />
          </span>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
        </div>
      )}
    </NavLink>
  );
}

function SLabel({ text }) {
  return (
    <div style={{
      fontSize:9.5, letterSpacing:'.14em', textTransform:'uppercase',
      color:'#475569', padding:'0 12px', margin:'14px 0 4px', fontWeight:700,
    }}>{text}</div>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const initials = user?.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || 'AH';
  const roleLabel = {
    super_admin:'Super Admin', manager:'Manager',
    associate:'Associate', sub_associate:'Sub-Associate',
  }[user?.role] || 'Associate';

  const allSections = [
    ...NAV,
    ...(isAdmin ? [ADMIN_SECTION] : []),
    ACCOUNT_SECTION,
  ];

  return (
    <>
      <aside style={{
        width:'var(--sb-w)', height:'100vh', position:'fixed', left:0, top:0, zIndex:200,
        background:'#1f53a1',           /* Slate-900 — dark but readable, not harsh */
        borderRight:'1px solid rgba(255, 255, 255, 0.8)',
        display:'flex', flexDirection:'column',
        boxShadow:'2px 0 12px rgba(0,0,0,0.15)',
        transition:'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
      }} className={`sidebar-el${isOpen ? ' sidebar-mobile-open' : ''}`}>

        {/* ── Logo ─────────────────────────────────────────── */}
        <div style={{ padding:'20px 16px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{
              width:36, height:36, borderRadius:10, flexShrink:0,
              background:'linear-gradient(135deg,#6366F1,#4F46E5)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 12px rgba(99,102,241,0.4)',
            }}>
              <SVG size={17} d={<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>} />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#F1F5F9', letterSpacing:'-0.2px' }}>Avya Home</div>
              <div style={{ fontSize:9, color:'#475569', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:1 }}>CRM Platform</div>
            </div>
            {/* Mobile close btn */}
            <button onClick={onClose}
              style={{ display:'none', marginLeft:'auto', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:7, width:28, height:28, cursor:'pointer', color:'#64748B', alignItems:'center', justifyContent:'center' }}
              className="sidebar-close-btn">
              <SVG size={13} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />
            </button>
          </div>

          {/* User card */}
          <div style={{
            background:'rgba(255,255,255,0.05)', borderRadius:10, padding:'10px 12px',
            display:'flex', alignItems:'center', gap:10,
            border:'1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width:32, height:32, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg,#6366F1,#8B5CF6)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:700, fontSize:11, color:'#fff',
            }}>{initials}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#E2E8F0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize:9.5, color:'#475569', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.associate_code} · {roleLabel}
              </div>
            </div>
            {/* Online dot */}
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#22C55E', flexShrink:0, boxShadow:'0 0 0 2px rgba(34,197,94,0.22)' }} />
          </div>
        </div>

        {/* ── Nav ──────────────────────────────────────────── */}
        <nav style={{ flex:1, padding:'6px 8px', overflowY:'auto' }}>
          {allSections.map(s => (
            <div key={s.section}>
              <SLabel text={s.section} />
              {s.items.map(item => <NavItem key={item.to} {...item} onClose={onClose} />)}
            </div>
          ))}
        </nav>

        {/* ── Logout ───────────────────────────────────────── */}
        <div style={{ padding:'8px 8px 14px', borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
          <button onClick={handleLogout} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10,
            padding:'9px 12px', borderRadius:9, border:'none',
            background:'rgba(239,68,68,0.08)', color:'#F87171',
            fontSize:12.5, fontWeight:600, cursor:'pointer',
            transition:'background 0.14s',
          }}
            onMouseOver={e => e.currentTarget.style.background='rgba(239,68,68,0.15)'}
            onMouseOut={e => e.currentTarget.style.background='rgba(239,68,68,0.08)'}
          >
            <SVG size={14} d={ICONS.logout} />
            Sign Out
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-el { transform: translateX(-100%) !important; }
          .sidebar-el.sidebar-mobile-open { transform: translateX(0) !important; }
          .sidebar-close-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
