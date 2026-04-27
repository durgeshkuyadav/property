import { useState, useEffect, useCallback } from 'react';
import { payoutAPI, pdfAPI } from '../utils/api';
import { downloadBlob } from './WelcomeLetterPage';
import Topbar from '../components/layout/Topbar';
import toast from 'react-hot-toast';

const fmt  = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const STATUS_BADGE = {
  pending:  { bg:'#FEF3C7', color:'#92400E', label:'Pending' },
  approved: { bg:'#EFF6FF', color:'#1D4ED8', label:'Approved' },
  paid:     { bg:'#D1FAE5', color:'#065F46', label:'Paid' },
  cancelled:{ bg:'#FFE4E6', color:'#9F1239', label:'Cancelled' },
};

/* ── Payout Statement Detail Modal ───────────────────────────── */
function StatementModal({ payoutId, onClose }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDl]  = useState(false);

  useEffect(() => {
    payoutAPI.getOne(payoutId)
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load payout details'))
      .finally(() => setLoading(false));
  }, [payoutId]);

  const handlePDF = async () => {
    setDl(true);
    try {
      const r = await pdfAPI.payoutStatement(payoutId);
      downloadBlob(r.data, `PayoutStatement_${data?.payout?.payout_code}.pdf`);
    } catch { toast.error('PDF failed'); } finally { setDl(false); }
  };

  if (loading) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)' }}>
      <div className="card glass-card" style={{ padding:40 }}><div className="spinner" /></div>
    </div>
  );

  const { payout, contributing_payments = [], bank_transfers = [] } = data || {};
  if (!payout) return null;

  const incomeRows = contributing_payments.map((p, i) => ({
    idx: i+1,
    fromTeam: 'Self--',
    customerName: p.customer_name,
    bookDate: fmtD(p.booking_date || p.deposit_date),
    projectName: p.project_name,
    plotNo: p.plot_number,
    plotId: p.block_code || p.plot_number,
    bsp: fmt(p.bsp_per_sqft || 0),
    mode: (p.payment_mode || '').replace('_','/').toUpperCase(),
    ref: p.ref_chq_number || '—',
    refDate: fmtD(p.ref_chq_date || p.deposit_date),
    amtType: p.payment_type === 'book_amount' ? 'Book Amount' : 'Custom',
    deposit: fmt(p.amount),
    incomeType: 'Self Income',
    pct: payout.commission_pct || 5,
    income: fmt(Math.round(parseFloat(p.amount) * (parseFloat(payout.commission_pct||5)/100))),
  }));

  const totalDeposit = contributing_payments.reduce((s,p) => s + parseFloat(p.amount||0), 0);
  const totalIncome  = parseFloat(payout.self_income || 0);

  const cols = ['INDEX','FROM TEAM','CUSTOMER NAME','BOOK DATE','PROJECT NAME','PLOT NO.','PLOT ID','BSP','MODE','RTGS/CHQ NO.','DATE','AMOUNT TYPE','DEPOSIT','INCOME TYPE','PER%','INCOME'];
  const rows = incomeRows.map(r => [r.idx, r.fromTeam, r.customerName, r.bookDate, r.projectName, r.plotNo, r.plotId, r.bsp, r.mode, r.ref, r.refDate, r.amtType, `₹${r.deposit}`, r.incomeType, `${r.pct}%`, `₹${r.income}`]);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:1000, padding:16, overflowY:'auto', backdropFilter:'blur(4px)' }}>
      <div className="card glass-card" style={{ width:'100%', maxWidth:1100, marginTop:16, marginBottom:16, padding:0, overflow:'hidden', animation:'floatUp 0.35s cubic-bezier(0.34,1.4,0.64,1) both' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1E1B4B,#312E81)', padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:'#fff', letterSpacing:'-0.2px' }}>PAYOUT STATEMENT</div>
            <div style={{ fontSize:11, color:'#A5B4FC', marginTop:2 }}>{payout.payout_code} · {fmtD(payout.from_date)} to {fmtD(payout.to_date)}</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button className="btn btn-sm" style={{ background:'rgba(255,255,255,0.12)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)' }} onClick={()=>window.print()}>Print</button>
            <button className="btn btn-sm" style={{ background:'#6366F1', color:'#fff' }} onClick={handlePDF} disabled={downloading}>
              {downloading ? '…' : '⬇ PDF'}
            </button>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, width:32, height:32, color:'#fff', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>
        </div>

        <div style={{ padding:'20px 24px' }}>
          {/* Promoter Info + Income Summary — 3-col grid like image 5 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:1, background:'rgba(148,163,184,0.12)', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
            {[
              { l:'Promoter Info',      v: `${payout.associate_name} [${payout.associate_code}]` },
              { l:'Self Income',        v: `₹${fmt(payout.self_income)}`,       c:'green' },
              { l:'Total Income',       v: `₹${fmt(payout.total_income)}`,      c:'indigo' },
              { l:'From Date',          v: fmtD(payout.from_date) },
              { l:'Level Income',       v: `₹${fmt(payout.level_income)}` },
              { l:'Admin Charge',       v: `₹${fmt(payout.admin_charge)}` },
              { l:'To Date',            v: fmtD(payout.to_date) },
              { l:'Leadership Income',  v: `₹${fmt(payout.leadership_income)}` },
              { l:'TDS Deduction',      v: `₹${fmt(payout.tds_amount)}`,        c:'red' },
              { l:'Self Business',      v: `₹${fmt(payout.self_income / (parseFloat(payout.commission_pct||5)/100))}` },
              { l:'Royalty Income',     v: `₹${fmt(payout.royalty_income)}` },
              { l:'Net Income',         v: `₹${fmt(payout.net_payable)}`,       c:'green' },
            ].map(item => (
              <div key={item.l} className="info-cell">
                <div className="info-label">{item.l}</div>
                <div className={`info-value ${item.c||''}`}>{item.v || '—'}</div>
              </div>
            ))}
          </div>

          {/* Main transaction table */}
          <div style={{ fontSize:12, fontWeight:700, color:'#334155', marginBottom:10 }}>Payout Statement</div>
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', borderRadius:10, boxShadow:'0 2px 12px rgba(99,102,241,0.08)' }}>
            {incomeRows.length === 0 ? (
              <div className="empty-state" style={{ padding:40, background:'rgba(248,250,252,0.8)' }}>
                No customer payments found in this payout period.
              </div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{
                          fontWeight: ci === 0 ? 700 : (String(cell).startsWith('₹') ? 700 : 400),
                          color: String(cell).startsWith('₹') ? '#059669' : (ci === 2 ? '#0F172A' : undefined),
                          whiteSpace: ci > 8 ? 'nowrap' : undefined,
                        }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={12} style={{ textAlign:'right', fontWeight:800, color:'#0F172A' }}>Total:</td>
                    <td style={{ color:'#059669', fontWeight:800 }}>₹{fmt(totalDeposit)}</td>
                    <td colSpan={2} style={{ textAlign:'right', fontWeight:800 }}>Total:</td>
                    <td style={{ color:'#4F46E5', fontWeight:800 }}>₹{fmt(totalIncome)}</td>
                  </tr>
                  <tr>
                    <td colSpan={14} style={{ textAlign:'right', fontWeight:800, color:'#0F172A', fontSize:13 }}>Final Total:</td>
                    <td colSpan={2} style={{ fontWeight:800, color:'#4F46E5', fontSize:14 }}>₹{fmt(totalIncome)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Bank transfer record */}
          {bank_transfers.length > 0 && (
            <div style={{ marginTop:16, padding:'12px 16px', background:'rgba(16,185,129,0.08)', borderRadius:10, border:'1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#065F46', marginBottom:8 }}>BANK TRANSFER RECORD</div>
              <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
                {[
                  ['Mode',       bank_transfers[0].mode_of_pay?.toUpperCase()],
                  ['Ref / UTR',  bank_transfers[0].ref_number],
                  ['Date',       fmtD(bank_transfers[0].ref_date)],
                  ['Gross',      `₹${fmt(bank_transfers[0].gross_amount)}`],
                  ['TDS',        `₹${fmt(bank_transfers[0].tds_deducted)}`],
                  ['Net Paid',   `₹${fmt(bank_transfers[0].net_paid)}`],
                ].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontSize:9.5, color:'#34D399', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#022c22', marginTop:1 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE — Earnings Dashboard
══════════════════════════════════════════════════════════════ */
export default function PayoutDetailPage() {
  const [payouts, setPayouts]   = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [selectedId, setSelected] = useState(null);
  const [statusFilter, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter, limit:50 } : { limit:50 };
      const [pRes, eRes] = await Promise.all([payoutAPI.getAll(params), payoutAPI.getEarnings()]);
      setPayouts(pRes.data.data || []);
      setEarnings(eRes.data.data);
    } catch { toast.error('Failed to load payouts'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const e = earnings?.totals || {};

  return (
    <>
      <Topbar title="Payout Detail" subtitle="Your earnings history and income breakdown" />
      <div className="page-body">

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
          {[
            { l:'Total Gross Earned', v:`₹${fmt(e.total_gross)}`, grad:'linear-gradient(135deg,#6366F1,#8B5CF6)', icon:'₹' },
            { l:'Net Received',       v:`₹${fmt(e.total_received)}`, grad:'linear-gradient(135deg,#10B981,#059669)', icon:'✓' },
            { l:'TDS Deducted',       v:`₹${fmt(e.total_tds)}`, grad:'linear-gradient(135deg,#F59E0B,#D97706)', icon:'%' },
            { l:'Pending Payouts',    v:`₹${fmt(e.pending_amount)}`, grad:'linear-gradient(135deg,#0EA5E9,#0284C7)', icon:'⏳' },
          ].map((c,i) => (
            <div key={c.l} className="stat-card float-card" style={{ padding:0, overflow:'hidden', '--accent-a':c.grad.match(/#\w+/)?.[0], '--accent-b':c.grad.match(/#\w+/)?.[1] }}>
              <div style={{ background:c.grad, padding:'14px 16px 12px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:38, height:38, background:'rgba(255,255,255,0.2)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', fontWeight:700 }}>{c.icon}</div>
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.8)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{c.l}</div>
              </div>
              <div style={{ padding:'12px 16px' }}>
                <div style={{ fontSize:20, fontWeight:800, color:'#0F172A', letterSpacing:'-0.5px' }}>{c.v}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
          {['','pending','approved','paid','cancelled'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className="btn btn-sm"
              style={{
                background: statusFilter===s ? '#4F46E5' : 'rgba(255,255,255,0.7)',
                color: statusFilter===s ? '#fff' : '#475569',
                border: statusFilter===s ? 'none' : '1.5px solid rgba(148,163,184,0.25)',
                backdropFilter:'blur(8px)',
                textTransform:'capitalize',
              }}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Payouts list */}
        <div className="card glass-card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
            ) : payouts.length === 0 ? (
              <div className="empty-state" style={{ padding:60 }}>No payout cycles found.</div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    {['Payout Code','Period','Self Income','Level Income','Total Income','TDS','Net Payable','Status','Action'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => {
                    const sb = STATUS_BADGE[p.status] || STATUS_BADGE.pending;
                    return (
                      <tr key={p.id}>
                        <td><span style={{ fontWeight:800, color:'#4F46E5', fontFamily:'monospace' }}>{p.payout_code}</span></td>
                        <td style={{ fontSize:11 }}>{fmtD(p.from_date)} <span style={{ color:'#94A3B8' }}>→</span> {fmtD(p.to_date)}</td>
                        <td style={{ fontWeight:700, color:'#059669' }}>₹{fmt(p.self_income)}</td>
                        <td style={{ fontWeight:600, color:'#7C3AED' }}>₹{fmt(p.level_income)}</td>
                        <td style={{ fontWeight:700 }}>₹{fmt(p.total_income)}</td>
                        <td style={{ color:'#DC2626' }}>₹{fmt(p.tds_amount)}</td>
                        <td style={{ fontWeight:800, color:'#059669', fontSize:13 }}>₹{fmt(p.net_payable)}</td>
                        <td><span style={{ background:sb.bg, color:sb.color, fontWeight:700, fontSize:10, padding:'3px 10px', borderRadius:99 }}>{sb.label}</span></td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => setSelected(p.id)}>
                            View Statement
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Totals</td>
                    <td style={{ color:'#059669' }}>₹{fmt(payouts.reduce((s,p)=>s+parseFloat(p.self_income||0),0))}</td>
                    <td style={{ color:'#7C3AED' }}>₹{fmt(payouts.reduce((s,p)=>s+parseFloat(p.level_income||0),0))}</td>
                    <td>₹{fmt(payouts.reduce((s,p)=>s+parseFloat(p.total_income||0),0))}</td>
                    <td style={{ color:'#DC2626' }}>₹{fmt(payouts.reduce((s,p)=>s+parseFloat(p.tds_amount||0),0))}</td>
                    <td style={{ color:'#059669' }}>₹{fmt(payouts.reduce((s,p)=>s+parseFloat(p.net_payable||0),0))}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* TDS notice */}
        <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:12, padding:'10px 16px', fontSize:11.5, color:'#4338CA', backdropFilter:'blur(8px)' }}>
          <strong>TDS Notice:</strong> Deducted at 5% (PAN provided — Sec 194H) or 20% (No PAN — Sec 206AA) per Income Tax Act 1961.
        </div>
      </div>

      {selectedId && <StatementModal payoutId={selectedId} onClose={() => setSelected(null)} />}
    </>
  );
}
