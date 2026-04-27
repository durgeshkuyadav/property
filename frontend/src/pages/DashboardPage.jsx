import { useState, useEffect, useRef } from 'react';
import { dashboardAPI } from '../utils/api';
import Topbar from '../components/layout/Topbar';
import { useAuth } from '../context/AuthContext';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

/* ── Animated counter ─────────────────────────────────────── */
function useCountUp(target, duration = 1000) {
  const [val, setVal] = useState(0);
  const frame = useRef(null);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(target * ease));
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);
  return val;
}

const fmt = (n) => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const fmtL = (n) => {
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`;
  return `₹${fmt(n)}`;
};

/* ── Stat Card ─────────────────────────────────────────────── */
function StatCard({ label, value, sub, accentA, accentB, iconBg, icon, prefix='₹', delay=0 }) {
  const animated = useCountUp(value, 900);
  return (
    <div className="stat-card" style={{
      '--accent-a': accentA, '--accent-b': accentB,
      animationDelay: `${delay}s`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div className="stat-icon" style={{ background: iconBg, marginBottom: 0 }}>
          {icon}
        </div>
        {sub && (
          <span style={{
            fontSize: 10.5, fontWeight: 600, padding: '3px 8px',
            borderRadius: 99, background: 'var(--primary-l)', color: 'var(--primary-d)',
          }}>{sub}</span>
        )}
      </div>
      <div className="stat-label" style={{ marginTop: 4 }}>{label}</div>
      <div className="stat-value">{prefix}{fmt(animated)}</div>
    </div>
  );
}

/* ── Mini stat ─────────────────────────────────────────────── */
function MiniStat({ label, value, color = 'var(--tx1)' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

/* ── Custom Tooltip ────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1E1B4B', color: '#fff', padding: '10px 14px',
      borderRadius: 10, fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    }}>
      <div style={{ color: '#A5B4FC', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>₹{fmt(payload[0]?.value)}</div>
    </div>
  );
};

/* ── Skeleton loader ───────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="stat-card" style={{ '--accent-a': '#e2e8f0', '--accent-b': '#cbd5e1' }}>
      <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 10, marginBottom: 14 }} />
      <div className="skeleton" style={{ width: '60%', height: 10, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '80%', height: 22 }} />
    </div>
  );
}

/* ── Progress Ring ─────────────────────────────────────────── */
function Ring({ pct, color, label, value }) {
  const r = 28, circ = 2 * Math.PI * r;
  const offset = circ * (1 - (pct || 0) / 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx1)', letterSpacing: '-0.5px' }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.get()
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const d = data || {};
  const teamPct = d.teamMembers ? Math.min(100, Math.round((d.directMembers / d.teamMembers) * 100)) : 0;

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <Topbar title="Dashboard" subtitle={`${greeting}, ${user?.name?.split(' ')[0]} 👋`}>
        <div style={{
          background: 'linear-gradient(135deg, var(--primary-l), #EDE9FE)',
          color: 'var(--primary-d)', padding: '5px 14px',
          borderRadius: 99, fontSize: 11, fontWeight: 600,
          border: '1px solid rgba(99,102,241,0.15)',
        }}>
          {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </Topbar>

      <div className="page-body">

        {/* ── Top Stat Cards ─────────────────────────────── */}
        <div className="stat-grid stat-grid-4">
          {loading ? (
            [0,1,2,3].map(i => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                label="Monthly Self Business" value={d.monthlyBusinessSelf || 0}
                sub="This month" delay={0.05}
                accentA="#6366F1" accentB="#8B5CF6"
                iconBg="var(--primary-l)"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                }
              />
              <StatCard
                label="Monthly Team Business" value={d.monthlyBusinessTeam || 0}
                sub="This month" delay={0.1}
                accentA="#10B981" accentB="#059669"
                iconBg="var(--sec-l)"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="1.8">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                    <path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                }
              />
              <StatCard
                label="Total Self Business" value={d.totalSelfBusiness || 0}
                delay={0.15}
                accentA="#F59E0B" accentB="#D97706"
                iconBg="var(--amber-l)"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.8">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                  </svg>
                }
              />
              <StatCard
                label="Net Payout Received" value={d.myPayout || 0}
                delay={0.2}
                accentA="#0EA5E9" accentB="#6366F1"
                iconBg="var(--sky-l)"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--sky)" strokeWidth="1.8">
                    <rect x="1" y="4" width="22" height="16" rx="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                }
              />
            </>
          )}
        </div>

        {/* ── Middle Row ─────────────────────────────────── */}
        <div className="three-col" style={{ marginBottom: 16 }}>

          {/* Network card */}
          <div className="card" style={{ animationDelay: '0.25s' }}>
            <div className="card-header" style={{ marginBottom: 20 }}>
              <div className="card-title">My Network</div>
              <span className="badge badge-primary">Active</span>
            </div>
            {loading ? (
              <div style={{ display: 'flex', gap: 16 }}>
                <div className="skeleton" style={{ width: 68, height: 68, borderRadius: '50%' }} />
                <div className="skeleton" style={{ width: 68, height: 68, borderRadius: '50%' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Ring pct={teamPct} color="#6366F1" label="Direct Members" value={d.directMembers || 0} />
                <Ring pct={100} color="#10B981" label="Total Team" value={d.teamMembers || 0} />
              </div>
            )}
          </div>

          {/* Bookings card */}
          <div className="card" style={{ animationDelay: '0.3s' }}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div className="card-title">Bookings</div>
              <span className="badge badge-green">Live</span>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 32, borderRadius: 8 }} />)}
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { l: 'Monthly', v: d.monthlyBookings || 0, bg: 'var(--primary-l)', c: 'var(--primary)' },
                    { l: 'Total', v: d.totalBookings || 0, bg: 'var(--sec-l)', c: 'var(--secondary)' },
                  ].map(item => (
                    <div key={item.l} style={{
                      background: item.bg, borderRadius: 12,
                      padding: '12px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: item.c, letterSpacing: '-0.5px' }}>
                        {item.v}
                      </div>
                      <div style={{ fontSize: 10, color: item.c, opacity: 0.75, fontWeight: 600, marginTop: 2 }}>
                        {item.l}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx3)', textAlign: 'center', background: 'var(--bg)', borderRadius: 8, padding: '7px' }}>
                  {fmt(d.totalSqft || 0)} sq.ft total area booked
                </div>
              </>
            )}
          </div>

          {/* Financials card */}
          <div className="card" style={{ animationDelay: '0.35s' }}>
            <div className="card-header" style={{ marginBottom: 12 }}>
              <div className="card-title">Financials</div>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 24 }} />)}
              </div>
            ) : (
              <>
                <MiniStat label="Payout Received" value={`₹${fmt(d.myPayout)}`} color="var(--secondary)" />
                <MiniStat label="Business (Self)" value={`₹${fmt(d.totalSelfBusiness)}`} color="var(--primary)" />
                <MiniStat label="Monthly Self" value={`₹${fmt(d.monthlyBusinessSelf)}`} color="var(--amber)" />
                <MiniStat label="Monthly Team" value={`₹${fmt(d.monthlyBusinessTeam)}`} color="var(--sky)" />
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6, color: 'var(--tx3)' }}>
                    <span>Business target</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      {Math.min(100, Math.round(((d.monthlyBusinessSelf || 0) / 500000) * 100))}%
                    </span>
                  </div>
                  <div className="progress">
                    <div className="progress-fill"
                      style={{ width: `${Math.min(100, Math.round(((d.monthlyBusinessSelf || 0) / 500000) * 100))}%` }} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Chart ─────────────────────────────────────── */}
        <div className="card" style={{ animationDelay: '0.4s' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Business Analytics</div>
              <div style={{ fontSize: 11, color: 'var(--tx4)', marginTop: 3 }}>
                Monthly self business — last 12 months
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="badge badge-primary">Self</span>
              <span className="badge badge-gray">₹ in Lakhs</span>
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={d.analytics || []}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }}
                  tickFormatter={v => v >= 100000 ? `${(v/100000).toFixed(0)}L` : `${(v/1000).toFixed(0)}K`}
                  axisLine={false} tickLine={false} width={38}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366F1', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone" dataKey="total"
                  stroke="#6366F1" strokeWidth={2.5}
                  fill="url(#grad)" dot={false}
                  activeDot={{ r: 5, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Quick Actions ─────────────────────────────── */}
        <div className="card" style={{ animationDelay: '0.45s' }}>
          <div className="card-title" style={{ marginBottom: 14 }}>Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(100px,1fr))', gap: 10 }}>
            {[
              { label: 'Add Customer', href: '/customers', color: 'var(--primary)', bg: 'var(--primary-l)',
                icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></> },
              { label: 'Payout Detail', href: '/payout-detail', color: 'var(--secondary)', bg: 'var(--sec-l)',
                icon: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></> },
              { label: 'My Team', href: '/downline', color: 'var(--amber)', bg: 'var(--amber-l)',
                icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></> },
              { label: 'Plot Status', href: '/plot-status', color: 'var(--sky)', bg: 'var(--sky-l)',
                icon: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></> },
            ].map(action => (
              <a key={action.label} href={action.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, padding: '16px 12px', borderRadius: 12,
                  background: action.bg, cursor: 'pointer',
                  transition: 'all 0.2s', border: '1px solid transparent',
                }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(255,255,255,0.6)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                      stroke={action.color} strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round">
                      {action.icon}
                    </svg>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: action.color, textAlign: 'center' }}>
                    {action.label}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
