import { useState, useEffect, useCallback } from 'react';
import { customerAPI, associateAPI, pdfAPI } from '../utils/api';
import { downloadBlob } from './WelcomeLetterPage';
import Topbar from '../components/layout/Topbar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const fmt  = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

/* ═══════════════════════════════════════════════════════════════
   CUSTOMER PAYMENT DETAIL MODAL  (Image 3 — exact match)
═══════════════════════════════════════════════════════════════ */
function CustomerPaymentModal({ customer, onClose, onPaymentAdded, isAdmin }) {
  const [payments, setPayments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAddForm, setShowAdd] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    amount: '', payment_type: 'custom_installment', payment_mode: 'rtgs_neft',
    ref_chq_number: '', ref_chq_date: '', ref_chq_bank: '',
    deposit_date: new Date().toISOString().slice(0,10),
    due_date: '', remarks: '',
  });

  const loadPayments = useCallback(() => {
    setLoading(true);
    customerAPI.getPayments(customer.id)
      .then(r => setPayments(r.data.data || []))
      .catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false));
  }, [customer.id]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter valid amount'); return; }
    setSaving(true);
    try {
      await customerAPI.addPayment(customer.id, { ...form, amount: parseFloat(form.amount) });
      toast.success('Payment recorded!');
      loadPayments();
      onPaymentAdded();
      setShowAdd(false);
      setForm({ amount:'', payment_type:'custom_installment', payment_mode:'rtgs_neft', ref_chq_number:'', ref_chq_date:'', ref_chq_bank:'', deposit_date:new Date().toISOString().slice(0,10), due_date:'', remarks:'' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add payment');
    } finally { setSaving(false); }
  };

  const balance = parseFloat(customer.total_amount||0) - parseFloat(customer.amount_paid||0);
  const STATUS_COLOR = { received:'#16A34A', pending:'#D97706', bounced:'#DC2626', cancelled:'#94A3B8' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:1100, padding:16, overflowY:'auto' }}>
      <div style={{
        width:'100%', maxWidth:1000, marginTop:20, marginBottom:20,
        background:'rgba(255,255,255,0.92)', backdropFilter:'blur(24px)',
        borderRadius:20, overflow:'hidden',
        boxShadow:'0 24px 80px rgba(99,102,241,0.2)',
        border:'1px solid rgba(255,255,255,0.7)',
        animation:'floatUp 0.3s cubic-bezier(0.34,1.4,0.64,1) both',
      }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1E1B4B,#312E81)', padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:'#fff' }}>CUSTOMER PAYMENT DETAIL</div>
            <div style={{ fontSize:11, color:'#A5B4FC', marginTop:2 }}>
              {customer.name} · Plot {customer.plot_number} · {customer.project_name}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {isAdmin && (
              <button onClick={() => setShowAdd(s => !s)}
                className="btn btn-sm"
                style={{ background:showAddForm?'#DC2626':'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)' }}>
                {showAddForm ? '✕ Cancel' : '+ Add Payment'}
              </button>
            )}
            <button onClick={async () => {
              try { const r = await pdfAPI.bookingReceipt(customer.id); downloadBlob(r.data, `Receipt_${customer.name}.pdf`); }
              catch { toast.error('PDF failed'); }
            }} className="btn btn-sm" style={{ background:'#6366F1', color:'#fff', border:'none' }}>⬇ Receipt</button>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, width:32, height:32, color:'#fff', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>
        </div>

        <div style={{ padding:'18px 24px' }}>
          {/* PLC/Discount info banner */}
          <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.12)', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#4338CA', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>PLC / Discount Detail:</div>
            <div style={{ fontSize:12, color:'#64748B' }}>
              {customer.plc_charges && parseFloat(customer.plc_charges) > 0
                ? `PLC Charges: ₹${fmt(customer.plc_charges)}`
                : 'No Additional Charge Or Discount Applicable...!'}
            </div>
          </div>

          {/* Balance summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
            {[
              { l:'Total Amount',  v:`₹${fmt(customer.total_amount)}`, c:'#0F172A' },
              { l:'Amount Paid',   v:`₹${fmt(customer.amount_paid)}`,  c:'#059669' },
              { l:'Balance Due',   v:`₹${fmt(balance)}`, c: balance>0?'#DC2626':'#059669' },
              { l:'Status', v: balance <= 0 ? 'SOLD OUT' : 'ACTIVE', c: balance <= 0 ? '#059669' : '#4F46E5' },
            ].map(s => (
              <div key={s.l} style={{ background:'rgba(248,250,252,0.8)', borderRadius:10, padding:'10px 14px', border:'1px solid rgba(148,163,184,0.15)' }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>{s.l}</div>
                <div style={{ fontSize:16, fontWeight:800, color:s.c, letterSpacing:'-0.4px' }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Add Payment Form */}
          {showAddForm && isAdmin && (
            <form onSubmit={handleAdd} style={{ background:'rgba(99,102,241,0.04)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#4338CA', marginBottom:12 }}>Record New Payment</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:10 }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Amount (₹) *</label>
                  <input className="form-input" type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="Enter amount" required />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Payment Type</label>
                  <select className="form-input" value={form.payment_type} onChange={e=>setForm(f=>({...f,payment_type:e.target.value}))}>
                    <option value="book_amount">Book Amount</option>
                    <option value="custom_installment">Custom Installment</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Mode *</label>
                  <select className="form-input" value={form.payment_mode} onChange={e=>setForm(f=>({...f,payment_mode:e.target.value}))}>
                    <option value="rtgs_neft">RTGS/NEFT</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Ref / Cheque No.</label>
                  <input className="form-input" value={form.ref_chq_number} onChange={e=>setForm(f=>({...f,ref_chq_number:e.target.value}))} placeholder="UTR / CHQ no." />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Cheque Date</label>
                  <input type="date" className="form-input" value={form.ref_chq_date} onChange={e=>setForm(f=>({...f,ref_chq_date:e.target.value}))} />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Bank</label>
                  <input className="form-input" value={form.ref_chq_bank} onChange={e=>setForm(f=>({...f,ref_chq_bank:e.target.value}))} placeholder="Bank name" />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Deposit Date *</label>
                  <input type="date" className="form-input" value={form.deposit_date} onChange={e=>setForm(f=>({...f,deposit_date:e.target.value}))} required />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Remarks</label>
                  <input className="form-input" value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} placeholder="Optional notes" />
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving?'Saving…':'Record Payment'}</button>
              </div>
            </form>
          )}

          {/* PAYMENTS table — Image 3 exact columns */}
          <div style={{ fontSize:12, fontWeight:700, color:'#334155', marginBottom:8 }}>PAYMENTS:</div>
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', borderRadius:10, boxShadow:'0 2px 12px rgba(99,102,241,0.08)' }}>
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner" /></div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    {['RECEIPT ID','P_ID(2)','UPDATE','DUE DATE','MODE','REF/CHQ.NO.','REF/CHQ.DT','REF/CHQ.ISSUE','REF/CHQ.BANK','RUPEES','AMT TYPE','STATUS','DEP DATE'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={13} style={{ textAlign:'center', padding:32, color:'#94A3B8', fontStyle:'italic' }}>No payment records yet.</td></tr>
                  ) : payments.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight:700, color:'#4F46E5', fontFamily:'monospace', fontSize:12 }}>{p.id}</td>
                      <td style={{ fontFamily:'monospace', fontSize:11, color:'#334155' }}>{customer.block_code || `PL${customer.plot_id}`}</td>
                      <td>
                        <span style={{ fontWeight:700, fontSize:10.5, color:p.status==='received'?'#059669':'#D97706' }}>
                          {p.status === 'received' ? 'DONE' : p.status?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize:11, color:'#64748B' }}>{fmtD(p.due_date)}</td>
                      <td>
                        <span style={{ background:'#EFF6FF', color:'#1D4ED8', fontWeight:700, fontSize:10, padding:'2px 8px', borderRadius:99 }}>
                          {p.payment_mode?.replace('_','/').toUpperCase() || 'RTGS/NEFT'}
                        </span>
                      </td>
                      <td style={{ fontFamily:'monospace', fontSize:11, color:'#0F172A', fontWeight:600 }}>{p.ref_chq_number || '—'}</td>
                      <td style={{ fontSize:11, color:'#64748B' }}>{fmtD(p.ref_chq_date)}</td>
                      <td style={{ fontSize:11, color:'#64748B' }}>{p.ref_chq_info || '—'}</td>
                      <td style={{ fontSize:11, color:'#334155' }}>{p.ref_chq_bank || '—'}</td>
                      <td style={{ fontWeight:800, color:'#0F172A', fontSize:13 }}>₹{fmt(p.amount)}</td>
                      <td>
                        <span style={{ background:'#F0FDF4', color:'#166534', fontSize:10.5, fontWeight:600, padding:'2px 8px', borderRadius:6 }}>
                          {p.payment_type === 'book_amount' ? 'Book Amount' : 'Custom'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight:700, fontSize:11, color:STATUS_COLOR[p.status]||'#64748B' }}>
                          {p.status === 'received' ? 'Recieved' : p.status?.charAt(0).toUpperCase()+p.status?.slice(1)}
                        </span>
                      </td>
                      <td style={{ fontSize:11, color:'#334155' }}>{fmtD(p.deposit_date)}</td>
                    </tr>
                  ))}
                </tbody>
                {payments.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={9} style={{ textAlign:'right', fontWeight:800 }}>Total Paid:</td>
                      <td style={{ fontWeight:800, color:'#059669', fontSize:13 }}>
                        ₹{fmt(payments.filter(p=>p.status==='received').reduce((s,p)=>s+parseFloat(p.amount),0))}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN CUSTOMERS PAGE  (Image 1 + 2 — exact match)
═══════════════════════════════════════════════════════════════ */
export default function CustomersPage() {
  const { isAdmin, user } = useAuth();
  const [customers, setCustomers]   = useState([]);
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);   // customer for payment modal
  const [promoterFilter, setPromoter] = useState('');
  const [searchText, setSearch]     = useState('');
  const [totalRecords, setTotal]    = useState(0);
  const [page, setPage]             = useState(1);
  const [showPromoterDrop, setShowDrop] = useState(false);

  // Load associates for promoter dropdown
  useEffect(() => {
    if (isAdmin) {
      associateAPI.getAll({ status:'active', limit:200 })
        .then(r => setAssociates(r.data.data || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit:20 };
    if (promoterFilter) params.promoter_id = promoterFilter;
    if (searchText) params.search = searchText;
    customerAPI.getAll(params)
      .then(r => {
        setCustomers(r.data.data || []);
        setTotal(r.data.pagination?.total || 0);
      })
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false));
  }, [page, promoterFilter, searchText]);

  useEffect(() => { load(); }, [load]);

  const selectedAssoc = associates.find(a => String(a.id) === String(promoterFilter));

  // STATUS chip
  const statusChip = (c) => {
    const bal = parseFloat(c.total_amount||0) - parseFloat(c.amount_paid||0);
    if (c.status === 'cancelled') return { label:'Cancelled', color:'#DC2626', bg:'#FFE4E6' };
    if (bal <= 0) return { label:'Sold Out', color:'#DC2626', bg:'#FFE4E6' };
    return { label:'Active', color:'#16A34A', bg:'#DCFCE7' };
  };

  return (
    <>
      <Topbar title="Customer Details" subtitle={`${totalRecords} total records`} />
      <div className="page-body">

        {/* ── Toolbar: Pages + Promoter Filter + Search ────── */}
        <div className="card glass-card" style={{ padding:'12px 18px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>

            {/* Record info */}
            <div style={{ fontSize:12, color:'#64748B', fontWeight:600, flexShrink:0 }}>
              Pages: <strong>{page}</strong> · Total Record: <strong>{totalRecords}</strong>
            </div>

            {/* Promoter dropdown — image 2 style */}
            {isAdmin && (
              <div style={{ position:'relative', flex:'0 0 auto' }}>
                <div style={{ fontSize:10.5, fontWeight:700, color:'#7C3AED', marginBottom:3, letterSpacing:'0.05em' }}>
                  (Promoter List)
                </div>
                <div
                  onClick={() => setShowDrop(s => !s)}
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'8px 14px', minWidth:260, cursor:'pointer',
                    background:'rgba(255,255,255,0.8)', backdropFilter:'blur(8px)',
                    border:'1.5px solid rgba(99,102,241,0.3)', borderRadius:10,
                    fontSize:12.5, fontWeight:600, color:'#0F172A',
                    boxShadow:'0 2px 8px rgba(99,102,241,0.08)',
                  }}
                >
                  <span>{promoterFilter && selectedAssoc ? `${selectedAssoc.name} [${selectedAssoc.associate_code}]` : '--ALL--'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                    <polyline points={showPromoterDrop ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
                  </svg>
                </div>

                {showPromoterDrop && (
                  <div style={{
                    position:'absolute', top:'100%', left:0, marginTop:4, zIndex:300,
                    background:'rgba(255,255,255,0.95)', backdropFilter:'blur(20px)',
                    borderRadius:12, boxShadow:'0 12px 40px rgba(99,102,241,0.2)',
                    border:'1px solid rgba(99,102,241,0.15)',
                    minWidth:280, maxHeight:280, overflowY:'auto',
                    animation:'floatUp 0.2s ease both',
                  }}>
                    {[{ id:'', name:'--ALL--', associate_code:'' }, ...associates].map(a => (
                      <div key={a.id || 'all'}
                        onClick={() => { setPromoter(a.id ? String(a.id) : ''); setShowDrop(false); setPage(1); }}
                        style={{
                          padding:'10px 16px', cursor:'pointer',
                          fontSize:12.5, fontWeight: promoterFilter === String(a.id) ? 700 : 400,
                          color: a.id ? '#0F172A' : '#4F46E5',
                          borderBottom:'1px solid rgba(148,163,184,0.1)',
                          background: promoterFilter === String(a.id) ? 'rgba(99,102,241,0.08)' : 'transparent',
                          transition:'background 0.12s',
                        }}
                        onMouseOver={e => e.currentTarget.style.background='rgba(99,102,241,0.06)'}
                        onMouseOut={e => e.currentTarget.style.background = promoterFilter === String(a.id) ? 'rgba(99,102,241,0.08)' : 'transparent'}
                      >
                        {a.id ? `${a.name} [${a.associate_code}]` : '--ALL--'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search box */}
            <div style={{ display:'flex', gap:8, alignItems:'center', flex:1, minWidth:200 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:'#7C3AED', whiteSpace:'nowrap', flexShrink:0 }}>
                (Par.: Name, Mob, Project, Plot No &amp; Size)
              </div>
              <input
                type="text" placeholder="Search..."
                value={searchText}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ padding:'8px 12px', borderRadius:9, border:'1.5px solid rgba(148,163,184,0.25)', fontSize:12, background:'rgba(255,255,255,0.8)', backdropFilter:'blur(8px)', outline:'none', flex:1 }}
                onFocus={e => { e.target.style.borderColor='#6366F1'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.1)'; }}
                onBlur={e => { e.target.style.borderColor='rgba(148,163,184,0.25)'; e.target.style.boxShadow='none'; }}
              />
              <button className="btn btn-primary btn-sm" onClick={load}>Submit</button>
            </div>
          </div>

          {/* Note */}
          <div style={{ fontSize:10.5, color:'#059669', marginTop:8, fontWeight:500 }}>
            Note*: For Pagewise Press Refresh...!
          </div>
        </div>

        {/* ── Main customer table — image 1 ─────────────────── */}
        <div className="card glass-card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
            ) : customers.length === 0 ? (
              <div className="empty-state" style={{ padding:60 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity:.35, marginBottom:12 }}>
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                </svg>
                No customers found
              </div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    {['INDEX','NAME','MOBILE','BK DATE','PROJECT','PLOT NO','SIZE','BSP','TOTAL','TOT PAID','BALANCE','PROMOTER','PAYMENTS','STATUS'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => {
                    const bal = parseFloat(c.total_amount||0) - parseFloat(c.amount_paid||0);
                    const chip = statusChip(c);
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight:700, color:'#64748B', fontSize:12 }}>
                          {(page-1)*20 + i + 1}
                        </td>
                        <td>
                          <div style={{ fontWeight:700, color:'#0F172A', fontSize:12.5, lineHeight:1.3 }}>{c.name}</div>
                        </td>
                        <td style={{ fontFamily:'monospace', fontSize:12, color:'#334155' }}>{c.mobile}</td>
                        <td style={{ fontSize:11.5, color:'#475569', whiteSpace:'nowrap' }}>{fmtD(c.booking_date)}</td>
                        <td>
                          <div style={{ fontWeight:600, color:'#1D4ED8', fontSize:11.5, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {c.project_name || '—'}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight:800, color:'#7C3AED', fontFamily:'monospace', fontSize:12 }}>{c.plot_number}</span>
                        </td>
                        <td style={{ fontWeight:600, color:'#334155' }}>{c.dimension_sqft || '—'}</td>
                        <td style={{ fontWeight:600, color:'#475569' }}>{c.bsp_per_sqft || '—'}</td>
                        <td style={{ fontWeight:700, color:'#0F172A' }}>₹{fmt(c.total_amount)}</td>
                        <td style={{ fontWeight:700, color:'#059669' }}>₹{fmt(c.amount_paid)}</td>
                        <td style={{ fontWeight:700, color: bal > 0 ? '#DC2626' : '#059669' }}>
                          {bal > 0 ? `₹${fmt(bal)}` : '0'}
                        </td>
                        <td>
                          <div style={{ fontSize:11, lineHeight:1.4 }}>
                            <div style={{ fontWeight:700, color:'#1D4ED8' }}>{c.promoter_name || '—'}</div>
                            {c.promoter_code && <div style={{ fontSize:9.5, color:'#64748B' }}>[{c.promoter_code}]</div>}
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => setSelected(c)}
                            style={{
                              fontWeight:700, fontSize:11, color:'#1D4ED8', cursor:'pointer',
                              background:'transparent', border:'none', textDecoration:'underline',
                              padding:0,
                            }}
                            onMouseOver={e => e.currentTarget.style.color='#7C3AED'}
                            onMouseOut={e => e.currentTarget.style.color='#1D4ED8'}
                          >
                            PAYMENTS
                          </button>
                        </td>
                        <td>
                          <span style={{ fontWeight:700, fontSize:11, color:chip.color, background:chip.bg, padding:'3px 10px', borderRadius:99 }}>
                            {chip.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={8} style={{ textAlign:'right' }}>Totals:</td>
                    <td style={{ fontWeight:800, color:'#0F172A' }}>₹{fmt(customers.reduce((s,c)=>s+parseFloat(c.total_amount||0),0))}</td>
                    <td style={{ fontWeight:800, color:'#059669' }}>₹{fmt(customers.reduce((s,c)=>s+parseFloat(c.amount_paid||0),0))}</td>
                    <td style={{ fontWeight:800, color:'#DC2626' }}>
                      ₹{fmt(customers.reduce((s,c)=>s+Math.max(0,parseFloat(c.total_amount||0)-parseFloat(c.amount_paid||0)),0))}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalRecords > 20 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'14px 20px', borderTop:'1px solid rgba(148,163,184,0.1)' }}>
              <button className="btn btn-outline btn-sm" disabled={page<=1} onClick={() => setPage(p=>p-1)}>← Prev</button>
              <span style={{ fontSize:12, color:'#64748B', fontWeight:600 }}>Page {page} of {Math.ceil(totalRecords/20)}</span>
              <button className="btn btn-outline btn-sm" disabled={page>=Math.ceil(totalRecords/20)} onClick={() => setPage(p=>p+1)}>Next →</button>
            </div>
          )}
        </div>
      </div>

      {/* Customer Payment Modal */}
      {selected && (
        <CustomerPaymentModal
          customer={selected}
          onClose={() => setSelected(null)}
          onPaymentAdded={load}
          isAdmin={isAdmin}
        />
      )}

      {/* Close promoter dropdown on outside click */}
      {showPromoterDrop && (
        <div style={{ position:'fixed', inset:0, zIndex:200 }} onClick={() => setShowDrop(false)} />
      )}
    </>
  );
}
