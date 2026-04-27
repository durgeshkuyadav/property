import { useState, useEffect, useCallback } from 'react';
import { payoutAPI } from '../utils/api';
import Topbar from '../components/layout/Topbar';
import toast from 'react-hot-toast';

const fmt  = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

export default function PaymentsPage() {
  const [transfers, setTransfers] = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');
  const [applied, setApplied]     = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payoutAPI.getTransfers(applied);
      setTransfers(res.data.data || []);
      setSummary(res.data.pagination?.summary || null);
    } catch { toast.error('Failed to load payment records'); }
    finally { setLoading(false); }
  }, [applied]);

  useEffect(() => { load(); }, [load]);

  const apply = () => {
    const f = {};
    if (from) f.from_date = from;
    if (to)   f.to_date   = to;
    setApplied(f);
  };

  const totalAmt    = transfers.reduce((s,t) => s+parseFloat(t.gross_amount||0), 0);
  const totalTDS    = transfers.reduce((s,t) => s+parseFloat(t.tds_deducted||0), 0);
  const totalNet    = transfers.reduce((s,t) => s+parseFloat(t.net_paid||0), 0);

  return (
    <>
      <Topbar title="Payout Payments" subtitle="All bank transfer records — RTGS / NEFT / IMPS / Cheque" />
      <div className="page-body">

        {/* Filter */}
        <div className="card glass-card" style={{ padding:'14px 20px', marginBottom:14 }}>
          <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">From Date</label>
              <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">To Date</label>
              <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={apply}>Search</button>
            {Object.keys(applied).length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={() => { setFrom(''); setTo(''); setApplied({}); }}>Clear</button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="card glass-card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    {['NO.','MODE OF PAY','CHQ/REF NO.','CHQ/REF INFO','CHQ/REF DATE','TDS STATUS','TDS%','AMOUNT','TDS AMOUNT','NET PAYABLE','REMARK*'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transfers.length === 0 ? (
                    <tr><td colSpan={11} style={{ textAlign:'center', padding:40, color:'#94A3B8' }}>No payment records found</td></tr>
                  ) : transfers.map((t, i) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight:700, color:'#64748B', fontSize:12 }}>{i + 1}</td>
                      <td>
                        <span style={{
                          background: t.mode_of_pay === 'rtgs' || t.mode_of_pay === 'neft' ? '#EFF6FF' : t.mode_of_pay === 'imps' ? '#EDE9FE' : '#FEF3C7',
                          color: t.mode_of_pay === 'rtgs' || t.mode_of_pay === 'neft' ? '#1D4ED8' : t.mode_of_pay === 'imps' ? '#5B21B6' : '#92400E',
                          fontWeight:700, fontSize:10.5, padding:'3px 10px', borderRadius:99, textTransform:'uppercase',
                        }}>
                          {t.mode_of_pay?.replace('_','/')?.toUpperCase() || 'NEFT'}
                        </span>
                      </td>
                      <td style={{ fontFamily:'monospace', fontWeight:600, fontSize:11.5, color:'#0F172A' }}>{t.ref_number || '—'}</td>
                      <td style={{ fontSize:11, color:'#64748B' }}>{t.ref_info || '—'}</td>
                      <td style={{ fontSize:11.5, color:'#334155' }}>{fmtD(t.ref_date)}</td>
                      <td>
                        <span style={{ background: t.tds_status ? '#D1FAE5' : '#FFE4E6', color: t.tds_status ? '#065F46' : '#9F1239', fontWeight:700, fontSize:10.5, padding:'2px 9px', borderRadius:99 }}>
                          {t.tds_status ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ fontWeight:700, color:'#7C3AED', fontSize:12 }}>{t.tds_percentage || 5}%</td>
                      <td style={{ fontWeight:700, fontSize:12.5 }}>₹{fmt(t.gross_amount)}</td>
                      <td style={{ fontWeight:600, color:'#DC2626', fontSize:12 }}>₹{fmt(t.tds_deducted)}</td>
                      <td style={{ fontWeight:800, color:'#059669', fontSize:13 }}>₹{fmt(t.net_paid)}</td>
                      <td style={{ fontSize:11, color:'#64748B', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {t.remark || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {transfers.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={7} style={{ textAlign:'right', fontWeight:800, fontSize:12 }}>Total:</td>
                      <td style={{ fontWeight:800, color:'#0F172A', fontSize:13 }}>₹{fmt(totalAmt)}</td>
                      <td style={{ fontWeight:800, color:'#DC2626', fontSize:13 }}>₹{fmt(totalTDS)}</td>
                      <td style={{ fontWeight:800, color:'#059669', fontSize:14 }}>₹{fmt(totalNet)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
