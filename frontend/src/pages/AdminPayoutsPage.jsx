import { useState, useEffect, useCallback } from 'react';
import { payoutAPI, associateAPI } from '../utils/api';
import Topbar from '../components/layout/Topbar';
import toast from 'react-hot-toast';

const fmt  = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const STATUS_BADGE = { pending: 'badge-amber', approved: 'badge-blue', paid: 'badge-green', cancelled: 'badge-red' };
const STATUS_LABEL = { pending: 'Pending', approved: 'Approved', paid: 'Paid', cancelled: 'Cancelled' };

const InfoRow = ({ label, value, highlight, valueStyle }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: highlight ? 700 : 500, ...valueStyle }}>{value}</span>
  </div>
);

/* ── Create Payout Modal ─────────────────────────────────────── */
function CreatePayoutModal({ onClose, onCreated }) {
  const [associates, setAssociates] = useState([]);
  const [preview, setPreview]       = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm] = useState({
    associate_id: '', from_date: '', to_date: '',
    advance_bonus: '', monthly_bonus: '', leadership_income: '',
    royalty_income: '', admin_charge: '',
  });

  useEffect(() => {
    associateAPI.getAll({ status: 'active', limit: 200 })
      .then(r => setAssociates(r.data.data || []))
      .catch(() => {});
  }, []);

  const handlePreview = async () => {
    if (!form.associate_id || !form.from_date || !form.to_date) {
      toast.error('Select associate, from date and to date first');
      return;
    }
    setPreviewing(true);
    try {
      const res = await payoutAPI.preview({
        associate_id: form.associate_id,
        from_date: form.from_date,
        to_date: form.to_date,
      });
      setPreview(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const handleCreate = async () => {
    if (!form.associate_id || !form.from_date || !form.to_date) {
      toast.error('Associate, from date and to date are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      ['advance_bonus','monthly_bonus','leadership_income','royalty_income','admin_charge']
        .forEach(k => { if (payload[k] === '') payload[k] = undefined; });
      await payoutAPI.create(payload);
      toast.success('Payout created successfully!');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create payout');
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setPreview(null); };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: 20, overflowY: 'auto' }}>
      <div style={{ background: 'var(--card)', borderRadius: 14, width: '100%', maxWidth: 560, marginTop: 20, marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Create Payout Cycle</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--ink3)', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Associate */}
          <div className="form-group">
            <label className="form-label">Associate *</label>
            <select className="form-input" value={form.associate_id} onChange={e => set('associate_id', e.target.value)}>
              <option value="">— Select Associate —</option>
              {associates.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.associate_code}) — {a.commission_pct}%</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">From Date *</label>
              <input type="date" className="form-input" value={form.from_date} onChange={e => set('from_date', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">To Date *</label>
              <input type="date" className="form-input" value={form.to_date} onChange={e => set('to_date', e.target.value)} />
            </div>
          </div>

          <button className="btn btn-outline btn-sm" onClick={handlePreview} disabled={previewing} style={{ marginBottom: 14, width: '100%' }}>
            {previewing ? 'Calculating...' : 'Preview Income Calculation'}
          </button>

          {/* Preview result */}
          {preview && (
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', marginBottom: 8, textTransform: 'uppercase' }}>
                Preview — {preview.associate.name} ({preview.associate.associate_code})
              </div>
              <InfoRow label="Own sales in period" value={`₹${fmt(preview.calculation.self_sales_total)}`} />
              <InfoRow label={`Self income (${preview.associate.commission_pct}%)`} value={`₹${fmt(preview.calculation.self_income)}`} />
              <InfoRow label="Level income (2% downline)" value={`₹${fmt(preview.calculation.level_income)}`} />
              <InfoRow label="Total income" value={`₹${fmt(preview.calculation.total_income)}`} highlight />
              <InfoRow label={`TDS (${preview.calculation.tds_percentage}% — ${preview.associate.pan_provided ? 'PAN' : 'No PAN'})`} value={`₹${fmt(preview.calculation.tds_amount)}`} valueStyle={{ color: 'var(--red)' }} />
              <InfoRow label="Net payable" value={`₹${fmt(preview.calculation.net_payable)}`} highlight valueStyle={{ color: 'var(--green)' }} />
              {preview.own_payments.length === 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--amber)', background: 'var(--ambl)', padding: '6px 10px', borderRadius: 6 }}>
                  No customer payments found in this period for this associate.
                </div>
              )}
            </div>
          )}

          {/* Optional bonuses */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', marginBottom: 8 }}>Optional Bonuses / Charges</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[
              { key: 'advance_bonus', label: 'Advance Bonus (₹)' },
              { key: 'monthly_bonus', label: 'Monthly Bonus (₹)' },
              { key: 'leadership_income', label: 'Leadership Income (₹)' },
              { key: 'royalty_income', label: 'Royalty Income (₹)' },
              { key: 'admin_charge', label: 'Admin Charge (₹)' },
            ].map(f => (
              <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{f.label}</label>
                <input type="number" min="0" step="0.01" className="form-input" placeholder="0"
                  value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating...' : 'Create Payout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Bank Transfer Modal ─────────────────────────────────────── */
function BankTransferModal({ payout, onClose, onSaved }) {
  const [form, setForm] = useState({ mode_of_pay: 'neft', ref_number: '', ref_info: '', ref_date: new Date().toISOString().slice(0,10), remark: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.ref_number || !form.ref_date) {
      toast.error('Ref number and date are required');
      return;
    }
    setSaving(true);
    try {
      await payoutAPI.recordTransfer(payout.id, form);
      toast.success('Bank transfer recorded. Payout marked as Paid!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record transfer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
      <div style={{ background: 'var(--card)', borderRadius: 14, width: '100%', maxWidth: 440 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Record Bank Transfer</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>
              {payout.payout_code} · Net: <strong>₹{fmt(payout.net_payable)}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--ink3)', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ background: 'var(--greenl)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--greend)', marginBottom: 14 }}>
            Associate: <strong>{payout.associate_name}</strong> · Bank: {payout.bank_name || '—'} · A/C: {payout.bank_account_no || '—'}
          </div>
          <div className="form-group">
            <label className="form-label">Payment Mode *</label>
            <select className="form-input" value={form.mode_of_pay} onChange={e => setForm(f => ({ ...f, mode_of_pay: e.target.value }))}>
              {['rtgs','neft','imps','cheque'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Ref / UTR Number *</label>
              <input className="form-input" placeholder="e.g. 516311293509" value={form.ref_number}
                onChange={e => setForm(f => ({ ...f, ref_number: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Transfer Date *</label>
              <input type="date" className="form-input" value={form.ref_date}
                onChange={e => setForm(f => ({ ...f, ref_date: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Remark</label>
            <input className="form-input" placeholder="e.g. Payout for April 2026" value={form.remark}
              onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Mark as Paid'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function AdminPayoutsPage() {
  const [payouts, setPayouts]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [bankModal, setBankModal]     = useState(null);
  const [filters, setFilters]         = useState({ status: '', page: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50, page: filters.page };
      if (filters.status) params.status = filters.status;
      const res = await payoutAPI.getAll(params);
      setPayouts(res.data.data || []);
    } catch {
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this payout?')) return;
    try {
      await payoutAPI.approve(id);
      toast.success('Payout approved!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this payout?')) return;
    try {
      await payoutAPI.cancel(id, { reason: 'Admin cancelled' });
      toast.success('Payout cancelled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed');
    }
  };

  return (
    <>
      <Topbar title="Payout Processing" subtitle="Create, approve and record all associate payouts">
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          + Create Payout
        </button>
      </Topbar>

      <div className="page-body">
        {/* Status filters */}
        <div className="card" style={{ padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 600 }}>Filter:</span>
            {['', 'pending', 'approved', 'paid', 'cancelled'].map(s => (
              <button key={s} onClick={() => setFilters(f => ({ ...f, status: s, page: 1 }))}
                className="btn btn-sm"
                style={{ background: filters.status === s ? 'var(--gold)' : 'var(--goldl)', color: filters.status === s ? '#fff' : 'var(--gold2)' }}>
                {s ? STATUS_LABEL[s] : 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">All Payout Cycles ({payouts.length})</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : payouts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)', fontSize: 13 }}>
              No payouts found. Click "Create Payout" to add one.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                    {['Code', 'Associate', 'Period', 'Self Inc.', 'Level Inc.', 'Total', 'TDS', 'Net Payable', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--ink2)', fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 700 }}>{p.payout_code}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <div style={{ fontWeight: 600 }}>{p.associate_name}</div>
                        <div style={{ fontSize: 10, color: 'var(--ink3)' }}>{p.associate_code}</div>
                      </td>
                      <td style={{ padding: '9px 10px', color: 'var(--ink2)', fontSize: 11 }}>
                        {fmtD(p.from_date)}<br /><span style={{ color: 'var(--ink3)' }}>to {fmtD(p.to_date)}</span>
                      </td>
                      <td style={{ padding: '9px 10px' }}>₹{fmt(p.self_income)}</td>
                      <td style={{ padding: '9px 10px', color: 'var(--blue)' }}>₹{fmt(p.level_income)}</td>
                      <td style={{ padding: '9px 10px', fontWeight: 600 }}>₹{fmt(p.total_income)}</td>
                      <td style={{ padding: '9px 10px', color: 'var(--red)' }}>₹{fmt(p.tds_amount)}</td>
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: 'var(--green)' }}>₹{fmt(p.net_payable)}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <span className={`badge ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                          {p.status === 'pending' && (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => handleApprove(p.id)}>Approve</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleCancel(p.id)}>Cancel</button>
                            </>
                          )}
                          {p.status === 'approved' && (
                            <button className="btn btn-primary btn-sm" style={{ background: 'var(--green)' }}
                              onClick={() => setBankModal(p)}>
                              Mark Paid
                            </button>
                          )}
                          {p.status === 'paid' && (
                            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>✓ Paid</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info box */}
        <div style={{ background: 'var(--bluel)', border: '1px solid var(--blue)', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: 'var(--blue)' }}>
          <strong>Workflow:</strong> Create Payout → Review Preview → Approve → Record Bank Transfer (Mark Paid). TDS deducted automatically at 5% (PAN) or 20% (no PAN).
        </div>
      </div>

      {showCreate && (
        <CreatePayoutModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {bankModal && (
        <BankTransferModal payout={bankModal} onClose={() => setBankModal(null)} onSaved={load} />
      )}
    </>
  );
}
