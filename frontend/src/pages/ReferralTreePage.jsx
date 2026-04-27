import { useState, useEffect } from 'react';
import { associateAPI } from '../utils/api';
import Topbar from '../components/layout/Topbar';
import toast from 'react-hot-toast';

const fmt    = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const fmtD   = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

// Convert number to Indian words
function toWords(n) {
  const num = Math.round(n || 0);
  if (!num) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const toW = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + toW(n%100) : '');
    if (n < 100000) return toW(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + toW(n%1000) : '');
    if (n < 10000000) return toW(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + toW(n%100000) : '');
    return toW(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + toW(n%10000000) : '');
  };
  return toW(num);
}

/* ── Avatar ─────────────────────────────────────────────────── */
function Avatar({ name, size = 44, bg = 'linear-gradient(135deg,#6366F1,#8B5CF6)' }) {
  const initials = name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || '??';
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background:bg, display:'flex', alignItems:'center', justifyContent:'center',
      fontWeight:700, fontSize:size*0.3, color:'#fff',
      boxShadow:'0 4px 12px rgba(99,102,241,0.35)',
    }}>{initials}</div>
  );
}

/* ── Member Card (Level-1 style like image) ──────────────────── */
function MemberCard({ member, index }) {
  const COLORS = [
    { bg:'linear-gradient(135deg,#6366F1,#8B5CF6)', border:'rgba(99,102,241,0.25)', tag:'#EEF2FF', tagText:'#4338CA' },
    { bg:'linear-gradient(135deg,#10B981,#059669)', border:'rgba(16,185,129,0.25)', tag:'#D1FAE5', tagText:'#065F46' },
    { bg:'linear-gradient(135deg,#F59E0B,#D97706)', border:'rgba(245,158,11,0.25)', tag:'#FEF3C7', tagText:'#92400E' },
    { bg:'linear-gradient(135deg,#0EA5E9,#0284C7)', border:'rgba(14,165,233,0.25)', tag:'#E0F2FE', tagText:'#0369A1' },
  ];
  const c = COLORS[index % COLORS.length];

  const rows = [
    { l:'User ID',       v: member.associate_code },
    { l:'Name',          v: member.name },
    { l:'Mobile',        v: member.mobile },
    { l:'Level',         v: member.role === 'associate' ? 'ASSOCIATE' : member.role?.toUpperCase() },
    { l:'Dir Members',   v: member.direct_members ?? 0 },
    { l:'Team Members',  v: member.team_members ?? 0 },
    { l:'Self Business', v: `₹${fmt(member.self_business)}` },
    { l:'Team Business', v: `₹${fmt(member.team_business)}` },
    { l:'Total Business',v: `₹${fmt(member.total_business)}` },
  ];

  return (
    <div className="member-card float-card" style={{
      border:`1.5px solid ${c.border}`, minWidth:200, maxWidth:230,
      animationDelay:`${index*0.08}s`,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <Avatar name={member.name} bg={c.bg} size={42} />
        <div>
          <div style={{ fontWeight:700, fontSize:13, color:'#0F172A', lineHeight:1.2 }}>{member.name}</div>
          <span style={{ fontSize:9.5, fontWeight:700, background:c.tag, color:c.tagText, padding:'2px 8px', borderRadius:99, marginTop:3, display:'inline-block' }}>
            {member.associate_code}
          </span>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {rows.slice(4).map(r => (
          <div key={r.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'3px 0', borderBottom:'1px solid rgba(148,163,184,0.1)' }}>
            <span style={{ fontSize:10.5, color:'#64748B', fontWeight:500 }}>{r.l}</span>
            <span style={{ fontSize:11, fontWeight:700, color: r.l.includes('Business') ? '#4F46E5' : '#0F172A' }}>{r.v}</span>
          </div>
        ))}
      </div>
      {member.joining_date && (
        <div style={{ marginTop:8, fontSize:10, color:'#94A3B8', textAlign:'right' }}>
          Joined {fmtD(member.joining_date)}
        </div>
      )}
    </div>
  );
}

/* ── Tree connector ─────────────────────────────────────────── */
const VLine = () => <div style={{ width:2, height:24, background:'linear-gradient(to bottom,rgba(99,102,241,0.4),rgba(99,102,241,0.1))', margin:'0 auto' }} />;
const HLine = ({ count }) => count > 1 ? (
  <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-start', width:'100%', position:'relative', marginBottom:2 }}>
    <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:2, background:'rgba(99,102,241,0.25)', borderRadius:1 }} />
  </div>
) : null;

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function ReferralTreePage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    associateAPI.getDownlineTree()
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load referral tree'))
      .finally(() => setLoading(false));
  }, []);

  const root = data?.tree;
  const stats = data?.stats || {};
  const directMembers = root?.children || [];

  const totalBusiness = (stats.self_business || 0) + (stats.team_business || 0);
  const inWords = toWords(Math.round(totalBusiness));

  return (
    <>
      <Topbar title="Referral Tree" subtitle="Your network structure and business summary" />
      <div className="page-body">

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
        ) : !root ? (
          <div className="card glass-card"><div className="empty-state">No network data found.</div></div>
        ) : (
          <>
            {/* ── Stats Summary Card ────────────────────────────── */}
            <div className="card glass-card float-card" style={{ marginBottom:20 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, background:'rgba(148,163,184,0.12)', borderRadius:12, overflow:'hidden', marginBottom:14 }}>
                {[
                  { l:'Direct Members',  v: stats.direct_members || directMembers.length || 0, c:'indigo' },
                  { l:'Team Members',    v: stats.team_members   || 0, c:'' },
                  { l:'Self Business',   v: `₹${fmt(stats.self_business)}`,  c:'green' },
                  { l:'Team Business',   v: `₹${fmt(stats.team_business)}`,  c:'indigo' },
                  { l:'Total Business',  v: `₹${fmt(totalBusiness)}`,         c:'green' },
                  { l:'Commission Rate', v: `${root.commission_pct || 5}%`,   c:'amber' },
                ].map(item => (
                  <div key={item.l} className="info-cell">
                    <div className="info-label">{item.l}</div>
                    <div className={`info-value ${item.c}`}>{item.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, color:'#64748B', fontStyle:'italic', textAlign:'center', padding:'8px 0', borderTop:'1px solid rgba(148,163,184,0.12)' }}>
                <span style={{ fontWeight:600, color:'#4F46E5' }}>In Words:</span> {inWords} Rupees
              </div>
            </div>

            {/* ── Tree View ────────────────────────────────────── */}
            <div className="card glass-card" style={{ overflowX:'auto' }}>
              <div className="card-header">
                <span className="card-title">Network Tree — {root.name} ({root.associate_code})</span>
                <span className="badge badge-primary">{directMembers.length} Direct Member{directMembers.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Root node */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'0 20px 20px' }}>
                {/* Root card */}
                <div style={{
                  background:'linear-gradient(135deg,#1E1B4B,#312E81)',
                  borderRadius:16, padding:'16px 24px', minWidth:240,
                  border:'2px solid rgba(99,102,241,0.4)',
                  boxShadow:'0 8px 32px rgba(99,102,241,0.3)',
                  display:'flex', alignItems:'center', gap:14,
                  marginBottom:0,
                }}>
                  <Avatar name={root.name} size={50} bg="linear-gradient(135deg,#818CF8,#6366F1)" />
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, color:'#fff', letterSpacing:'-0.2px' }}>{root.name}</div>
                    <div style={{ fontSize:11, color:'#A5B4FC', marginTop:2 }}>{root.associate_code}</div>
                    <div style={{ marginTop:6 }}>
                      <span style={{ fontSize:9.5, fontWeight:700, background:'rgba(165,180,252,0.2)', color:'#C7D2FE', padding:'2px 10px', borderRadius:99, border:'1px solid rgba(165,180,252,0.3)' }}>
                        {root.commission_pct}% Commission
                      </span>
                    </div>
                  </div>
                </div>

                {directMembers.length > 0 && (
                  <>
                    <VLine />
                    {/* Level-1 label */}
                    <div style={{ background:'linear-gradient(135deg,#EEF2FF,#E0E7FF)', color:'#4338CA', fontWeight:700, fontSize:11, padding:'5px 16px', borderRadius:99, marginBottom:16, border:'1px solid rgba(99,102,241,0.2)' }}>
                      ▼ Promoter Level-1 ({directMembers.length} Members)
                    </div>

                    {/* Level-1 member cards */}
                    <div style={{ display:'flex', gap:16, flexWrap:'wrap', justifyContent:'center' }}>
                      {directMembers.map((member, i) => (
                        <div key={member.id} style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                          <MemberCard member={member} index={i} />

                          {/* Level-2 children */}
                          {member.children?.length > 0 && (
                            <>
                              <VLine />
                              <div style={{ fontSize:10, fontWeight:600, color:'#64748B', background:'#F1F5F9', padding:'3px 12px', borderRadius:99, marginBottom:12 }}>
                                Level-2 ({member.children.length})
                              </div>
                              <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
                                {member.children.map((child, j) => (
                                  <MemberCard key={child.id} member={child} index={j} />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {directMembers.length === 0 && (
                  <div style={{ marginTop:32, textAlign:'center', color:'#94A3B8', fontSize:13 }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ margin:'0 auto 12px', display:'block', opacity:0.4 }}>
                      <circle cx="12" cy="5" r="3"/><path d="M12 8v13"/><path d="M5 21v-3a7 7 0 0114 0v3"/>
                    </svg>
                    No direct members yet. Share your referral link to grow your network.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
