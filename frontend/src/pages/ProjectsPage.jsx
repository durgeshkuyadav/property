import { useState, useEffect, useCallback } from 'react';
import { projectAPI } from '../utils/api';
import Topbar from '../components/layout/Topbar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const EMPTY = { project_name:'', location:'', total_area:'', total_plots:'', base_price_sqft:'', launch_date:'', description:'' };

const statusColor = { active:'badge-green', completed:'badge-blue', archived:'badge-gray' };

const fmt = n => new Intl.NumberFormat('en-IN').format(Math.round(n||0));

export default function ProjectsPage() {
  const { isAdmin } = useAuth();
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState({});
  const [detailId, setDetailId]   = useState(null);
  const [detail, setDetail]       = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    projectAPI.getAll()
      .then(r => setProjects(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!detailId) { setDetail(null); return; }
    projectAPI.getOne(detailId).then(r => setDetail(r.data.data)).catch(console.error);
  }, [detailId]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setErrors({}); setModal(true); };
  const openEdit   = (p)  => { setEditing(p); setForm({ project_name:p.project_name, location:p.location||'', total_area:p.total_area||'', total_plots:p.total_plots||'', base_price_sqft:p.base_price_sqft||'', launch_date:p.launch_date?p.launch_date.slice(0,10):'', description:p.description||'' }); setErrors({}); setModal(true); };

  const validate = () => {
    const e = {};
    if (!form.project_name.trim()) e.project_name = 'Project name required';
    if (form.base_price_sqft && isNaN(form.base_price_sqft)) e.base_price_sqft = 'Must be a number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, base_price_sqft: form.base_price_sqft ? parseFloat(form.base_price_sqft) : undefined, total_plots: form.total_plots ? parseInt(form.total_plots) : undefined };
      if (editing) {
        await projectAPI.update(editing.id, payload);
        toast.success('Project updated!');
      } else {
        await projectAPI.create(payload);
        toast.success('Project created!');
      }
      setModal(false); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleArchive = async (p) => {
    if (!window.confirm(`Archive "${p.project_name}"?`)) return;
    try { await projectAPI.update(p.id, { status: 'archived' }); toast.success('Archived'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <>
      <Topbar title="Projects" subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''}`}>
        {isAdmin && <button className="btn btn-primary" onClick={openCreate}>+ Add Project</button>}
      </Topbar>

      <div className="page-body">
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner"/></div>
        ) : projects.length === 0 ? (
          <div className="card"><div className="empty-state">No projects yet. Create your first project!</div></div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:14 }}>
            {projects.map(p => (
              <div key={p.id} className="card" style={{ cursor:'pointer' }} onClick={() => setDetailId(p.id === detailId ? null : p.id)}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:3 }}>{p.project_name}</div>
                    <div style={{ fontSize:11, color:'var(--ink3)' }}>{p.location || 'No location set'}</div>
                  </div>
                  <span className={`badge ${statusColor[p.status] || 'badge-gray'}`}>{p.status}</span>
                </div>

                {/* Stats row */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4, marginBottom:12 }}>
                  {[
                    ['Total', p.actual_plots || 0, '#5B4FBE', '#fff'],
                    ['Avail.', p.available_count || 0, '#0A7C4E', '#D6F5E8'],
                    ['Hold', p.hold_count || 0, '#C07000', '#FFF3CD'],
                    ['Booked', p.booked_count || 0, '#1565C0', '#E3F0FF'],
                    ['Sold', p.sold_count || 0, '#C0392B', '#FDECEA'],
                  ].map(([label, val, bg, textBg]) => (
                    <div key={label} style={{ textAlign:'center', padding:'6px 2px', borderRadius:7, background:textBg }}>
                      <div style={{ fontSize:15, fontWeight:700, color:bg }}>{val}</div>
                      <div style={{ fontSize:9, color:'#666', fontWeight:600 }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display:'flex', gap:8, fontSize:11, color:'var(--ink3)', marginBottom:12, flexWrap:'wrap' }}>
                  {p.base_price_sqft && <span>BSP: ₹{fmt(p.base_price_sqft)}/sq.ft</span>}
                  {p.launch_date && <span>Launch: {new Date(p.launch_date).toLocaleDateString('en-IN')}</span>}
                </div>

                {isAdmin && (
                  <div style={{ display:'flex', gap:6, borderTop:'1px solid var(--border)', paddingTop:10 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}>Edit</button>
                    {p.status !== 'archived' && <button className="btn btn-sm btn-outline" onClick={() => handleArchive(p)}>Archive</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Detail panel */}
        {detail && (
          <div className="card" style={{ marginTop:14 }}>
            <div className="card-header">
              <div className="card-title">{detail.project_name} — Details</div>
              <button className="btn btn-outline btn-sm" onClick={() => setDetailId(null)}>Close ×</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
              {[
                ['Total Area', detail.total_area ? `${fmt(detail.total_area)} sq.ft` : '—'],
                ['Total Plots', detail.actual_plots],
                ['Base Price', detail.base_price_sqft ? `₹${fmt(detail.base_price_sqft)}/sq.ft` : '—'],
                ['Available', detail.available_count],
                ['On Hold', detail.hold_count],
                ['Booked', detail.booked_count],
                ['Sold Out', detail.sold_count],
                ['Total Sq.ft', detail.total_sqft ? fmt(detail.total_sqft) : '—'],
              ].map(([l, v]) => (
                <div key={l} style={{ background:'#F4F4FA', borderRadius:9, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'var(--ink3)', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)' }}>{v}</div>
                </div>
              ))}
            </div>
            {detail.description && <div style={{ marginTop:12, fontSize:12, color:'var(--ink2)', background:'#F4F4FA', borderRadius:8, padding:'10px 12px' }}>{detail.description}</div>}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'var(--card)', borderRadius:16, padding:24, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>{editing ? 'Edit Project' : 'Create New Project'}</div>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', fontSize:22, color:'var(--ink3)', cursor:'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Project Name *</label>
                  <input className={`form-input ${errors.project_name?'error':''}`} value={form.project_name} onChange={e => setForm(f=>({...f,project_name:e.target.value}))} placeholder="e.g. Avya Heights Phase 1" />
                  {errors.project_name && <div className="form-error">{errors.project_name}</div>}
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Location</label>
                  <input className="form-input" value={form.location} onChange={e => setForm(f=>({...f,location:e.target.value}))} placeholder="City, District, State" />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Plots</label>
                  <input className="form-input" type="number" value={form.total_plots} onChange={e => setForm(f=>({...f,total_plots:e.target.value}))} placeholder="e.g. 200" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Area (sq.ft)</label>
                  <input className="form-input" type="number" value={form.total_area} onChange={e => setForm(f=>({...f,total_area:e.target.value}))} placeholder="e.g. 150000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Base Price / sq.ft (₹)</label>
                  <input className={`form-input ${errors.base_price_sqft?'error':''}`} type="number" value={form.base_price_sqft} onChange={e => setForm(f=>({...f,base_price_sqft:e.target.value}))} placeholder="e.g. 499" step="0.01" />
                  {errors.base_price_sqft && <div className="form-error">{errors.base_price_sqft}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Launch Date</label>
                  <input className="form-input" type="date" value={form.launch_date} onChange={e => setForm(f=>({...f,launch_date:e.target.value}))} />
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Description</label>
                  <textarea className="form-input" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Project description, highlights..." rows={3} style={{ resize:'vertical' }} />
                </div>
                {editing && (
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" value={form.status||editing.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Project' : 'Create Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
