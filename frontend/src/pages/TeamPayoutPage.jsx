import { useState, useEffect, useCallback } from 'react';
import { payoutAPI, associateAPI } from '../utils/api';
import { pdfAPI } from '../utils/api';
import { downloadBlob } from './WelcomeLetterPage';
import Topbar from '../components/layout/Topbar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const fmt  = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

/* ── Payout Statement Modal (full detail) ────────────────────── */
function StatementModal({ associateId, associateName, onClose }) {
  const [payouts, setPayouts]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    payoutAPI.getAll({ associate_id: associateId, limit: 50 })
      .then(r => setPayouts(r.data.data || []))
      .catch(() => toast.error('Failed to load statement'))
      .finally(() => setLoading(false));
  }, [associateId]);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.65)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:1200, padding:16, overflowY:'auto' }}>
      <div style={{ width:'100%', maxWidth:900, marginTop:20, background:'rgba(255,255,255,0.95)', backdropFilter:'blur(24px)', borderRadius:20, overflow:'hidden', boxShadow:'0 24px 80px rgba(99,102,241,0.25)', animation:'floatUp 0.3s ease both' }}>
        <div style={{ background:'linear-gradient(135deg,#1E1B4B,#312E81)', padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:'#fff' }}>PAYOUT STATEMENT</div>
            <div style={{ fontSize:11, color:'#A5B4FC', marginTop:2 }}>{associateName}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, width:32, height:32, color:'#fff', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:'18px 24px', overflowX:'auto' }}>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner" /></div>
          ) : payouts.length === 0 ? (
            <div className="empty-state">No payout records found for this associate.</div>
          ) : (
            <table className="modern-table">
              <thead>
                <tr>
                  {['Payout Code','Period','Self Income','Level Income','Leadership','Royalty','Total Inc','Admin','TDS(%)','Net Payable','Status'].map(h=><th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id}>
                    <td><span style={{ fontWeight:800, color:'#4F46E5', fontFamily:'monospace' }}>{p.payout_code}</span></td>
                    <td style={{ fontSize:11 }}>{fmtD(p.from_date)} → {fmtD(p.to_date)}</td>
                    <td style={{ fontWeight:700, color:'#059669' }}>{fmt(p.self_income)}</td>
                    <td style={{ color:'#7C3AED' }}>{fmt(p.level_income)}</td>
                    <td>{fmt(p.leadership_income)}</td>
                    <td>{fmt(p.royalty_income)}</td>
                    <td style={{ fontWeight:700 }}>{fmt(p.total_income)}</td>
                    <td>{fmt(p.admin_charge)} (@{p.admin_pct||0}%)</td>
                    <td>{fmt(p.tds_amount)} (@{p.tds_percentage}%)</td>
                    <td style={{ fontWeight:800, color:'#059669', fontSize:13 }}>{fmt(p.net_payable)}</td>
                    <td><span style={{ fontSize:10.5, fontWeight:700, padding:'2px 9px', borderRadius:99, background: p.status==='paid'?'#D1FAE5':p.status==='approved'?'#EFF6FF':'#FEF3C7', color: p.status==='paid'?'#065F46':p.status==='approved'?'#1D4ED8':'#92400E' }}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Totals</td>
                  <td style={{ color:'#059669', fontWeight:800 }}>{fmt(payouts.reduce((s,p)=>s+parseFloat(p.self_income||0),0))}</td>
                  <td style={{ color:'#7C3AED', fontWeight:700 }}>{fmt(payouts.reduce((s,p)=>s+parseFloat(p.level_income||0),0))}</td>
                  <td>{fmt(payouts.reduce((s,p)=>s+parseFloat(p.leadership_income||0),0))}</td>
                  <td>{fmt(payouts.reduce((s,p)=>s+parseFloat(p.royalty_income||0),0))}</td>
                  <td style={{ fontWeight:800 }}>{fmt(payouts.reduce((s,p)=>s+parseFloat(p.total_income||0),0))}</td>
                  <td>{fmt(payouts.reduce((s,p)=>s+parseFloat(p.admin_charge||0),0))}</td>
                  <td>{fmt(payouts.reduce((s,p)=>s+parseFloat(p.tds_amount||0),0))}</td>
                  <td style={{ color:'#059669', fontWeight:800, fontSize:14 }}>{fmt(payouts.reduce((s,p)=>s+parseFloat(p.net_payable||0),0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE — PAYOUTS (image 5)
   Shows dropdown: self + all downline associates
   Each row: SELF INCOME | LEVEL INCOME | LEADERSHIP | ROYALTY | TOTAL | ADMIN | TDS | PAYABLE | STATEMENT
══════════════════════════════════════════════════════════════ */
export default function TeamPayoutPage() {
  const { user, isAdmin } = useAuth();
  const [allAssociates, setAllAssociates] = useState([]); // self + downline
  const [selectedId, setSelectedId]       = useState('');
  const [showDrop, setShowDrop]           = useState(false);
  const [tableData, setTableData]         = useState([]);  // one row per associate
  const [loading, setLoading]             = useState(false);
  const [statementFor, setStatementFor]   = useState(null); // { id, name }
  const [searched, setSearched]           = useState(false);

  // Load self + downline associates
  useEffect(() => {
    const loadAssociates = async () => {
      try {
        // Get own downline flat list
        const downRes = await associateAPI.getDownlineFlat(null, { limit:200 });
        const downline = downRes.data.data || [];
        // Get own profile — response is { associate: {...}, stats: {...} }
        const selfRes = await associateAPI.getOne(user.id);
        const selfData = selfRes.data.data;
        const self = selfData.associate || selfData; // handle both shapes
        // Combine: self first, then downline
        const combined = [
          { id: self.id, name: self.name, associate_code: self.associate_code },
          ...downline.filter(d => d.id !== self.id).map(d => ({ id:d.id, name:d.name, associate_code:d.associate_code })),
        ];
        setAllAssociates(combined);
        // Default select self
        setSelectedId(String(self.id));
      } catch {
        toast.error('Failed to load associates');
      }
    };
    loadAssociates();
  }, [user.id]);

  const handleSearch = useCallback(async () => {
    if (!selectedId) { toast.error('Select an associate'); return; }
    setLoading(true);
    setSearched(true);
    try {
      // Load payouts for the selected associate (+ their downline aggregated)
      const targetAssoc = allAssociates.find(a => String(a.id) === selectedId);
      if (!targetAssoc) return;

      // Get their downline too
      const downRes = await associateAPI.getDownlineFlat(targetAssoc.id, { limit:200 }).catch(()=>({ data:{ data:[] } }));
      const downline = downRes.data.data || [];

      // Build list: selected associate + their direct downline
      const memberList = [
        targetAssoc,
        ...downline.filter(d => String(d.id) !== selectedId),
      ];

      // Aggregate payout totals per associate
      const rows = await Promise.all(
        memberList.map(async (assoc) => {
          try {
            const res = await payoutAPI.getEarnings ? 
              payoutAPI.getAll({ associate_id: assoc.id, limit:100 }) :
              payoutAPI.getAll({ associate_id: assoc.id, limit:100 });
            const payouts = res.data.data || [];
            return {
              id:              assoc.id,
              name:            assoc.name,
              associate_code:  assoc.associate_code,
              self_income:     payouts.reduce((s,p)=>s+parseFloat(p.self_income||0),0),
              level_income:    payouts.reduce((s,p)=>s+parseFloat(p.level_income||0),0),
              leadership:      payouts.reduce((s,p)=>s+parseFloat(p.leadership_income||0),0),
              royalty:         payouts.reduce((s,p)=>s+parseFloat(p.royalty_income||0),0),
              total_income:    payouts.reduce((s,p)=>s+parseFloat(p.total_income||0),0),
              admin_charge:    payouts.reduce((s,p)=>s+parseFloat(p.admin_charge||0),0),
              tds_amount:      payouts.reduce((s,p)=>s+parseFloat(p.tds_amount||0),0),
              tds_pct:         payouts[0]?.tds_percentage || 5,
              net_payable:     payouts.reduce((s,p)=>s+parseFloat(p.net_payable||0),0),
              payout_count:    payouts.length,
            };
          } catch {
            return { id:assoc.id, name:assoc.name, associate_code:assoc.associate_code, self_income:0, level_income:0, leadership:0, royalty:0, total_income:0, admin_charge:0, tds_amount:0, tds_pct:5, net_payable:0, payout_count:0 };
          }
        })
      );
      setTableData(rows);
    } catch { toast.error('Failed to load payout data'); }
    finally { setLoading(false); }
  }, [selectedId, allAssociates]);

  const selectedAssoc = allAssociates.find(a => String(a.id) === selectedId);

  // Totals
  const totals = tableData.reduce((acc, r) => ({
    self_income:  acc.self_income  + r.self_income,
    level_income: acc.level_income + r.level_income,
    leadership:   acc.leadership   + r.leadership,
    royalty:      acc.royalty      + r.royalty,
    total_income: acc.total_income + r.total_income,
    admin_charge: acc.admin_charge + r.admin_charge,
    tds_amount:   acc.tds_amount   + r.tds_amount,
    net_payable:  acc.net_payable  + r.net_payable,
  }), { self_income:0, level_income:0, leadership:0, royalty:0, total_income:0, admin_charge:0, tds_amount:0, net_payable:0 });

  return (
    <>
      <Topbar title="Payouts" subtitle="Team payout report — select associate to view their network payouts" />
      <div className="page-body">

        {/* ── Associate selector + Search ── (image 5 exact) ── */}
        <div className="card glass-card" style={{ padding:'14px 18px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>

            {/* Dropdown */}
            <div style={{ position:'relative' }}>
              <div
                onClick={() => setShowDrop(s => !s)}
                style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'9px 14px', minWidth:320, cursor:'pointer',
                  background:'rgba(255,255,255,0.85)', backdropFilter:'blur(8px)',
                  border:'1.5px solid rgba(99,102,241,0.3)', borderRadius:10,
                  fontSize:12.5, fontWeight:600, color:'#0F172A',
                  boxShadow:'0 2px 8px rgba(99,102,241,0.1)',
                }}
              >
                <span>
                  {selectedAssoc
                    ? `${selectedAssoc.associate_code}----${selectedAssoc.name}`
                    : 'Select Associate…'}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                  <polyline points={showDrop ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
                </svg>
              </div>

              {showDrop && (
                <div style={{
                  position:'absolute', top:'100%', left:0, marginTop:4, zIndex:400,
                  background:'rgba(255,255,255,0.97)', backdropFilter:'blur(20px)',
                  borderRadius:12, boxShadow:'0 12px 40px rgba(99,102,241,0.22)',
                  border:'1px solid rgba(99,102,241,0.15)',
                  minWidth:320, maxHeight:240, overflowY:'auto',
                  animation:'floatUp 0.18s ease both',
                }}>
                  {allAssociates.map((a, i) => (
                    <div key={a.id}
                      onClick={() => { setSelectedId(String(a.id)); setShowDrop(false); }}
                      style={{
                        padding:'10px 16px', cursor:'pointer', fontSize:12.5,
                        fontWeight: String(a.id) === selectedId ? 700 : 400,
                        color: i === 0 ? '#4F46E5' : '#0F172A',
                        borderBottom:'1px solid rgba(148,163,184,0.1)',
                        background: String(a.id) === selectedId ? 'rgba(99,102,241,0.08)' : 'transparent',
                        transition:'background .1s',
                      }}
                      onMouseOver={e => e.currentTarget.style.background='rgba(99,102,241,0.06)'}
                      onMouseOut={e => e.currentTarget.style.background = String(a.id)===selectedId ? 'rgba(99,102,241,0.08)' : 'transparent'}
                    >
                      {`${a.associate_code}----${a.name}`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
              {loading ? 'Loading…' : 'SEARCH'}
            </button>

            {selectedAssoc && searched && (
              <div style={{ fontWeight:700, fontSize:13, color:'#4F46E5', textDecoration:'underline' }}>
                {selectedAssoc.name} [{selectedAssoc.associate_code}]
              </div>
            )}
          </div>
        </div>

        {/* ── Payout table (image 5 exact columns) ─────────── */}
        {searched && (
          <div className="card glass-card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
              {loading ? (
                <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
              ) : tableData.length === 0 ? (
                <div className="empty-state" style={{ padding:60 }}>No payout data found.</div>
              ) : (
                <table className="modern-table">
                  <thead>
                    <tr>
                      {['Associate','SELF INCOME','LEVEL INCOME','LEADERSHIP INCOME','ROYALTY INCOME','TOTAL INC','ADMIN','TDS(%)','PAYABLE','STATEMENT'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((r, i) => (
                      <tr key={r.id} style={{ background: i===0 ? 'rgba(99,102,241,0.04)' : undefined }}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{
                              width:28, height:28, borderRadius:'50%', flexShrink:0,
                              background: i===0 ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : 'linear-gradient(135deg,#10B981,#059669)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:10, fontWeight:700, color:'#fff',
                            }}>
                              {r.name?.split(' ').map(n=>n[0]).join('').slice(0,2)}
                            </div>
                            <div>
                              <div style={{ fontWeight:700, fontSize:12, color:'#0F172A' }}>{r.associate_code}</div>
                              <div style={{ fontSize:10.5, color:'#64748B' }}>{r.name}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight:700, color:'#059669' }}>{fmt(r.self_income)}</td>
                        <td style={{ color:'#7C3AED' }}>{fmt(r.level_income)}</td>
                        <td>{fmt(r.leadership)}</td>
                        <td>{fmt(r.royalty)}</td>
                        <td style={{ fontWeight:700 }}>{fmt(r.total_income)}</td>
                        <td>{fmt(r.admin_charge)} (@{0}%)</td>
                        <td>{fmt(r.tds_amount)} (@{r.tds_pct}%)</td>
                        <td style={{ fontWeight:800, color:'#059669', fontSize:13 }}>{fmt(r.net_payable)}</td>
                        <td>
                          {r.payout_count > 0 ? (
                            <button
                              onClick={() => setStatementFor({ id:r.id, name:`${r.name} [${r.associate_code}]` })}
                              style={{ fontWeight:700, fontSize:11.5, color:'#1D4ED8', cursor:'pointer', background:'transparent', border:'none', textDecoration:'underline', padding:0 }}
                              onMouseOver={e => e.currentTarget.style.color='#7C3AED'}
                              onMouseOut={e => e.currentTarget.style.color='#1D4ED8'}
                            >
                              STATEMENT
                            </button>
                          ) : <span style={{ color:'#94A3B8', fontSize:11 }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ fontWeight:800, fontSize:12 }}>Total:</td>
                      <td style={{ fontWeight:800, color:'#059669' }}>{fmt(totals.self_income)}</td>
                      <td style={{ fontWeight:700, color:'#7C3AED' }}>{fmt(totals.level_income)}</td>
                      <td style={{ fontWeight:700 }}>{fmt(totals.leadership)}</td>
                      <td style={{ fontWeight:700 }}>{fmt(totals.royalty)}</td>
                      <td style={{ fontWeight:800 }}>{fmt(totals.total_income)}</td>
                      <td style={{ fontWeight:700 }}>{fmt(totals.admin_charge)}</td>
                      <td style={{ fontWeight:700 }}>{fmt(totals.tds_amount)}</td>
                      <td style={{ fontWeight:800, color:'#059669', fontSize:14 }}>{fmt(totals.net_payable)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Statement detail modal */}
      {statementFor && (
        <StatementModal
          associateId={statementFor.id}
          associateName={statementFor.name}
          onClose={() => setStatementFor(null)}
        />
      )}

      {showDrop && <div style={{ position:'fixed', inset:0, zIndex:300 }} onClick={() => setShowDrop(false)} />}
    </>
  );
}
