import { useState, useCallback, useEffect } from 'react';
import { customerAPI } from '../utils/api';
import Topbar from '../components/layout/Topbar';
import toast from 'react-hot-toast';

const fmt  = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const PAY_MODE = { rtgs_neft:'RTGS/NEFT', cheque:'Cheque', cash:'Cash', online:'Online' };
const PAY_TYPE = { book_amount:'Book Amount', custom_installment:'Custom' };

export default function MonthlyBusinessPage() {
  const today  = new Date().toISOString().slice(0,10);
  const first  = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);

  const [fromDate, setFrom]  = useState('0000-00-00');
  const [toDate,   setTo]    = useState(today);
  const [rows,     setRows]  = useState([]);
  const [summary,  setSummary] = useState({});
  const [loading,  setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(() => {
    setLoading(true);
    setSearched(true);
    const params = {};
    if (fromDate && fromDate !== '0000-00-00') params.from_date = fromDate;
    if (toDate) params.to_date = toDate;

    customerAPI.getMonthlyBiz(params)
      .then(r => {
        setRows(r.data.data?.payments || []);
        setSummary(r.data.data?.summary || {});
      })
      .catch(() => toast.error('Failed to load monthly business'))
      .finally(() => setLoading(false));
  }, [fromDate, toDate]);

  useEffect(() => { handleSearch(); }, []);

  // Compute fund summary
  const totalAmt     = rows.reduce((s,r) => s + parseFloat(r.amount||0), 0);
  const unclearedAmt = rows.filter(r => r.payment_status === 'pending').reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const bouncedAmt   = rows.filter(r => r.payment_status === 'bounced').reduce((s,r)=>s+parseFloat(r.amount||0),0);

  return (
    <>
      <Topbar title="Monthly Business" subtitle="Complete payment register with date range filter" />
      <div className="page-body">

        {/* ── Filter bar (image 1 style) ─────────────────────── */}
        <div className="card glass-card" style={{ padding:'12px 18px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:14, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:10.5, fontWeight:700, color:'#64748B', marginBottom:5 }}>From Date:</div>
              <input type="date" value={fromDate === '0000-00-00' ? '' : fromDate}
                onChange={e => setFrom(e.target.value || '0000-00-00')}
                style={{ padding:'8px 12px', borderRadius:9, border:'1.5px solid rgba(148,163,184,0.3)', fontSize:12.5, background:'rgba(255,255,255,0.85)', outline:'none', backdropFilter:'blur(8px)' }}
                onFocus={e => { e.target.style.borderColor='#6366F1'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.1)'; }}
                onBlur={e => { e.target.style.borderColor='rgba(148,163,184,0.3)'; e.target.style.boxShadow='none'; }}
              />
            </div>
            <div>
              <div style={{ fontSize:10.5, fontWeight:700, color:'#64748B', marginBottom:5 }}>To Date:</div>
              <input type="date" value={toDate}
                onChange={e => setTo(e.target.value)}
                style={{ padding:'8px 12px', borderRadius:9, border:'1.5px solid rgba(148,163,184,0.3)', fontSize:12.5, background:'rgba(255,255,255,0.85)', outline:'none', backdropFilter:'blur(8px)' }}
                onFocus={e => { e.target.style.borderColor='#6366F1'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.1)'; }}
                onBlur={e => { e.target.style.borderColor='rgba(148,163,184,0.3)'; e.target.style.boxShadow='none'; }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSearch} disabled={loading}
              style={{ marginBottom:0 }}>
              {loading ? 'Searching…' : '🔍 SEARCH'}
            </button>
            {searched && rows.length > 0 && (
              <div style={{ fontSize:12, color:'#64748B', alignSelf:'center' }}>
                Search From: <strong>{fromDate}</strong>, To: <strong>{toDate}</strong>
              </div>
            )}
          </div>
        </div>

        {/* ── Main table ────────────────────────────────────── */}
        <div className="card glass-card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
            ) : !searched ? (
              <div className="empty-state" style={{ padding:60 }}>Select date range and click SEARCH</div>
            ) : rows.length === 0 ? (
              <div className="empty-state" style={{ padding:60 }}>No records found for selected period</div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    {['NAME','BK DATE','PROJECT','PLOT NO','SIZE','PAY TYPE','PAY MODE','CHQ/REF NO','CHQ/REF DATE','AMOUNT','DATE','STATUS','PROMOTER'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.payment_id || i}>
                      <td style={{ fontWeight:700, color:'#0F172A', minWidth:120 }}>{r.customer_name}</td>
                      <td style={{ fontSize:11.5, color:'#475569', whiteSpace:'nowrap' }}>{fmtD(r.booking_date)}</td>
                      <td style={{ fontWeight:600, color:'#1D4ED8', minWidth:120, fontSize:11.5 }}>{r.project_name}</td>
                      <td>
                        <span style={{ fontWeight:800, color:'#7C3AED', fontFamily:'monospace', fontSize:12 }}>{r.plot_number}</span>
                      </td>
                      <td style={{ fontSize:11.5, color:'#334155', whiteSpace:'nowrap' }}>
                        {r.dimension_sqft ? `${r.dimension_sqft}Sq/Ft` : '—'}
                      </td>
                      <td>
                        <span style={{ background:'#F0F9FF', color:'#0369A1', fontSize:10.5, fontWeight:600, padding:'2px 8px', borderRadius:6 }}>
                          {PAY_TYPE[r.payment_type] || r.payment_type}
                        </span>
                      </td>
                      <td>
                        <span style={{ background:'#EFF6FF', color:'#1D4ED8', fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:6 }}>
                          {PAY_MODE[r.payment_mode] || r.payment_mode}
                        </span>
                      </td>
                      <td style={{ fontFamily:'monospace', fontSize:11, color:'#334155', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis' }}>
                        {r.ref_chq_number || '—'}
                      </td>
                      <td style={{ fontSize:11.5, color:'#475569', whiteSpace:'nowrap' }}>{fmtD(r.ref_chq_date)}</td>
                      <td style={{ fontWeight:800, color:'#059669', fontSize:13, whiteSpace:'nowrap' }}>
                        {fmt(r.amount)}
                      </td>
                      <td style={{ fontSize:11.5, color:'#475569', whiteSpace:'nowrap' }}>
                        <span style={{ color:'#4F46E5', fontWeight:600, textDecoration:'underline', cursor:'default' }}>
                          {fmtD(r.deposit_date)}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontWeight:700, fontSize:11,
                          color: r.payment_status === 'received' ? '#16A34A' : r.payment_status === 'bounced' ? '#DC2626' : '#D97706',
                        }}>
                          {r.payment_status === 'received' ? 'Payment Done..!' : r.payment_status === 'bounced' ? 'Bounced' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ fontSize:11, minWidth:140 }}>
                        <div style={{ fontWeight:600, color:'#1D4ED8' }}>
                          {r.promoter_code ? `${r.promoter_code}----${r.promoter_name}` : '—'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Total row — image 2 exact */}
                <tfoot>
                  <tr>
                    <td colSpan={8} style={{ textAlign:'left', fontWeight:800, color:'#0F172A', fontSize:12 }}>
                      Total Record: {rows.length}
                    </td>
                    <td />
                    <td style={{ fontWeight:800, color:'#059669', fontSize:14 }}>{fmt(totalAmt)}</td>
                    <td colSpan={3} />
                  </tr>
                  {/* Fund summary row — image 2 exact */}
                  <tr style={{ background:'rgba(99,102,241,0.04)' }}>
                    <td colSpan={3} style={{ padding:'10px 14px' }}>
                      {/* empty */}
                    </td>
                    <td colSpan={3} style={{ fontWeight:700, color:'#334155', fontSize:12 }}>
                      Uncleared Fund: <span style={{ color:'#4F46E5' }}>{fmt(unclearedAmt)}</span>
                    </td>
                    <td colSpan={3} style={{ fontWeight:700, color:'#334155', fontSize:12 }}>
                      Bounced Fund: <span style={{ color:'#DC2626' }}>{fmt(bouncedAmt)}</span>
                    </td>
                    <td colSpan={4} style={{ fontWeight:700, color:'#334155', fontSize:12 }}>
                      Projection Fund: <span style={{ color:'#059669', fontWeight:800, fontSize:13 }}>{fmt(totalAmt)}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
