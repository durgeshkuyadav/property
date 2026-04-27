import { useState, useEffect, useCallback } from 'react';
import { associateAPI } from '../utils/api';
import Topbar from '../components/layout/Topbar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', mobile: '', email: '', password: '', commission_pct: '5', role: 'associate', sponsor_id: '' };

export default function AdminAssociatesPage() {
  const { isSuperAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [allAssociates, setAllAssociates] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    associateAPI.getAll({ search, page, limit: 15 })
      .then(r => { setRows(r.data.data); setPagination(r.data.pagination || {}); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    associateAPI.getAll({ limit: 100 })
      .then(r => setAllAssociates(r.data.data || []))
      .catch(() => {});
  }, []);

  const validateForm = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile required';
    if (!form.password || form.password.length < 8) e.password = 'Min 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) e.password = 'Must have uppercase, lowercase, number';
    if (!form.commission_pct) e.commission_pct = 'Required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = { ...form, commission_pct: parseFloat(form.commission_pct), sponsor_id: form.sponsor_id ? parseInt(form.sponsor_id) : undefined };
      const { data } = await associateAPI.create(payload);
      toast.success(`Associate created! ID: ${data.data.associate_code}`);
      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create associate');
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await associateAPI.update(id, { status });
      toast.success(`Status updated to ${status}`);
      load();
    } catch { toast.error('Update failed'); }
  };

  const statusBadge = (s) => ({ active: 'badge-green', inactive: 'badge-gray', suspended: 'badge-red' }[s] || 'badge-gray');

  return (
    <>
      <Topbar title="Manage Associates" subtitle={`${pagination.total || 0} total associates`}>
        <input className="form-input" type="text" placeholder="Search name, ID, mobile..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 200 }} />
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setFormErrors({}); setShowModal(true); }}>
          + Add Associate
        </button>
      </Topbar>

      <div className="page-body">
        <div className="card">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : rows.length === 0 ? (
            <div className="empty-state">No associates found</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>ID</th><th>Name</th><th>Mobile</th><th>Role</th><th>Commission</th><th>Sponsor</th><th>Joined</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><strong style={{ color: 'var(--gold)' }}>{r.associate_code}</strong></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--goldl)', color: 'var(--gold2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                            {r.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 12 }}>{r.name}</div>
                            {r.email && <div style={{ fontSize: 10, color: 'var(--ink3)' }}>{r.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{r.mobile}</td>
                      <td><span className={`badge ${r.role === 'super_admin' ? 'badge-red' : r.role === 'manager' ? 'badge-amber' : 'badge-blue'}`}>{r.role}</span></td>
                      <td><span className={`badge ${r.commission_pct >= 8 ? 'badge-green' : 'badge-amber'}`}>{r.commission_pct}%</span></td>
                      <td style={{ fontSize: 11 }}>{r.sponsor_code || '—'}<br /><span style={{ color: 'var(--ink3)' }}>{r.sponsor_name || ''}</span></td>
                      <td style={{ fontSize: 11 }}>{r.joining_date ? new Date(r.joining_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td><span className={`badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {r.status !== 'active' && <button className="btn btn-sm" style={{ background: 'var(--greenl)', color: 'var(--greend)', border: 'none' }} onClick={() => handleStatusChange(r.id, 'active')}>Activate</button>}
                          {r.status === 'active' && isSuperAdmin && <button className="btn btn-sm" style={{ background: 'var(--redl)', color: 'var(--red)', border: 'none' }} onClick={() => handleStatusChange(r.id, 'suspended')}>Suspend</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, marginTop: 10, borderTop: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--ink3)' }}>Page {pagination.page} of {pagination.totalPages}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-outline btn-sm" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <button className="btn btn-outline btn-sm" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Create New Associate</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--ink3)', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Full Name', name: 'name', type: 'text' },
                  { label: 'Mobile Number', name: 'mobile', type: 'tel' },
                  { label: 'Email (optional)', name: 'email', type: 'email' },
                  { label: 'Password', name: 'password', type: 'password' },
                ].map(({ label, name, type }) => (
                  <div className="form-group" key={name}>
                    <label className="form-label">{label}</label>
                    <input className={`form-input ${formErrors[name] ? 'error' : ''}`} type={type}
                      placeholder={`Enter ${label.toLowerCase()}`}
                      value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} />
                    {formErrors[name] && <div className="form-error">{formErrors[name]}</div>}
                  </div>
                ))}

                <div className="form-group">
                  <label className="form-label">Commission %</label>
                  <select className="form-input" value={form.commission_pct} onChange={e => setForm(f => ({ ...f, commission_pct: e.target.value }))}>
                    {[3,5,8,10,12,15].map(v => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="associate">Associate</option>
                    <option value="sub_associate">Sub Associate</option>
                    {isSuperAdmin && <option value="manager">Manager</option>}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Sponsor (Who referred this person?)</label>
                  <select className="form-input" value={form.sponsor_id} onChange={e => setForm(f => ({ ...f, sponsor_id: e.target.value }))}>
                    <option value="">-- No Sponsor --</option>
                    {allAssociates.map(a => <option key={a.id} value={a.id}>{a.associate_code} — {a.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ background: 'var(--goldl)', border: '1px solid #E8C840', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 11, color: 'var(--amber)' }}>
                A welcome email with login credentials will be sent to the associate's email address automatically.
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Associate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
