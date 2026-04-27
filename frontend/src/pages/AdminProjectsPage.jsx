import { useState, useEffect, useCallback } from 'react';
import { projectAPI, plotAPI } from '../utils/api';
import Topbar from '../components/layout/Topbar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const fmt  = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const STATUS_BADGE = { active: 'badge-green', completed: 'badge-blue', archived: 'badge-gray' };

/* ── Plot Status Summary mini badge ─────────────────────────── */
function PlotMini({ label, count, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '6px 10px', borderRadius: 8, background: color + '18' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color }}>{count}</div>
      <div style={{ fontSize: 9, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

/* ── Plot Bulk Import Modal ──────────────────────────────────── */
function BulkImportModal({ project, onClose, onDone }) {
  const [text, setText] = useState('plot_number,dimension_sqft,bsp_per_sqft,block_code,plot_category,plot_facing\nJ101,499,2200,Block-J,Corner East,East\nJ102,750,2000,Block-J,Intermittent Plot,North');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setLoading(true);
    try {
      const lines = text.trim().split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const plots = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim());
        return headers.reduce((obj, h, i) => { obj[h] = vals[i]; return obj; }, {});
      });
      const res = await plotAPI.bulkCreate({ project_id: project.id, plots });
      setResult(res.data.data);
      toast.success(`Imported: ${res.data.data.created} plots created`);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:20 }}>
      <div style={{ background:'var(--card)', borderRadius:16, width:'100%', maxWidth:560 }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>Bulk Import Plots</div>
            <div style={{ fontSize:11, color:'var(--tx3)', marginTop:2 }}>{project.project_name}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--tx3)' }}>×</button>
        </div>
        <div style={{ padding:20 }}>
          <div style={{ fontSize:11, color:'var(--tx3)', marginBottom:8 }}>
            Paste CSV below. First row = headers. Required: <code>plot_number, dimension_sqft, bsp_per_sqft</code>
          </div>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            style={{ width:'100%', height:180, fontFamily:'monospace', fontSize:11, padding:10, border:'1.5px solid var(--border2)', borderRadius:10, resize:'vertical', outline:'none' }}
          />
          {result && (
            <div style={{ marginTop:10, padding:'8px 12px', background:'var(--sec-l)', borderRadius:8, fontSize:12, color:'var(--secondary)' }}>
              ✓ Created: <strong>{result.created}</strong> · Skipped: {result.skipped}
              {result.errors?.length > 0 && <div style={{ color:'var(--rose)', marginTop:4 }}>{result.errors.slice(0,3).join(', ')}</div>}
            </div>
          )}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:14 }}>
            <button className="btn btn-outline" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
              {loading ? 'Importing…' : 'Import Plots'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Project Form Modal ──────────────────────────────────────── */
function ProjectModal({ editing, onClose, onSaved }) {
  const empty = { project_name:'', location:'', total_area:'', base_price_sqft:'', launch_date:'', status:'active', description:'' };
  const [form, setForm] = useState(editing || empty);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.project_name.trim()) { toast.error('Project name required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await projectAPI.update(editing.id, form);
        toast.success('Project updated!');
      } else {
        await projectAPI.create(form);
        toast.success('Project created!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'var(--card)', borderRadius:16, width:'100%', maxWidth:500 }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
          <div style={{ fontWeight:700, fontSize:14 }}>{editing ? 'Edit Project' : 'New Project'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--tx3)' }}>×</button>
        </div>
        <div style={{ padding:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label className="form-label">Project Name *</label>
              <input className="form-input" placeholder="e.g. Avya Heights Phase 1"
                value={form.project_name} onChange={e => set('project_name', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label className="form-label">Location</label>
              <input className="form-input" placeholder="Full address / city"
                value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Total Area (sq.ft)</label>
              <input className="form-input" type="number" min="0"
                value={form.total_area} onChange={e => set('total_area', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Base Price / sq.ft (₹)</label>
              <input className="form-input" type="number" min="0"
                value={form.base_price_sqft} onChange={e => set('base_price_sqft', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Launch Date</label>
              <input className="form-input" type="date"
                value={form.launch_date?.slice(0,10) || ''} onChange={e => set('launch_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={form.description}
                onChange={e => set('description', e.target.value)} style={{ resize:'vertical' }} />
            </div>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function AdminProjectsPage() {
  const { isSuperAdmin } = useAuth();
  const [projects, setProjects]       = useState([]);
  const [plotSummary, setPlotSummary] = useState({});
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);   // null | 'create' | {project}
  const [importModal, setImportModal] = useState(null);   // null | project

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectAPI.getAll({ limit: 100 });
      const projs = res.data.data || [];
      setProjects(projs);

      // Load plot summary for each project
      const summaries = {};
      await Promise.all(projs.map(async p => {
        try {
          const s = await plotAPI.getSummary({ project_id: p.id });
          summaries[p.id] = s.data.data;
        } catch {}
      }));
      setPlotSummary(summaries);
    } catch {
      toast.error('Failed to load projects');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleArchive = async (id) => {
    if (!window.confirm('Archive this project?')) return;
    try {
      await projectAPI.update(id, { status: 'archived' });
      toast.success('Project archived');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const totalStats = projects.reduce((acc, p) => {
    const s = plotSummary[p.id] || {};
    acc.available += (s.available || 0);
    acc.booked    += (s.booked || 0) + (s.hold || 0);
    acc.sold      += (s.sold_out || 0);
    acc.total     += (p.total_plots || 0);
    return acc;
  }, { available: 0, booked: 0, sold: 0, total: 0 });

  return (
    <>
      <Topbar title="Manage Projects" subtitle="Create projects, add plots, track inventory">
        <button className="btn btn-primary btn-sm" onClick={() => setModal('create')}>
          + New Project
        </button>
      </Topbar>

      <div className="page-body">

        {/* Summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
          {[
            { l:'Total Projects', v: projects.length,        c:'var(--primary)',   bg:'var(--primary-l)', prefix:'' },
            { l:'Available Plots',v: totalStats.available,   c:'var(--secondary)', bg:'var(--sec-l)',     prefix:'' },
            { l:'Booked / Hold',  v: totalStats.booked,      c:'var(--amber)',     bg:'var(--amber-l)',   prefix:'' },
            { l:'Sold Out',       v: totalStats.sold,        c:'var(--rose)',      bg:'var(--rose-l)',    prefix:'' },
          ].map(c => (
            <div key={c.l} style={{ background:c.bg, border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'14px 16px' }}>
              <div style={{ fontSize:10, fontWeight:600, color:c.c, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{c.l}</div>
              <div style={{ fontSize:24, fontWeight:800, color:c.c }}>{c.v}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
        ) : projects.length === 0 ? (
          <div className="card">
            <div className="empty-state">No projects yet. Click "+ New Project" to create one.</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {projects.map(p => {
              const s = plotSummary[p.id] || {};
              const total = p.total_plots || 0;
              const sold  = (s.sold_out || 0);
              const pct   = total > 0 ? Math.round((sold / total) * 100) : 0;

              return (
                <div key={p.id} className="card" style={{ marginBottom:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:'var(--tx1)' }}>{p.project_name}</div>
                        <span className={`badge ${STATUS_BADGE[p.status] || 'badge-gray'}`}>{p.status}</span>
                      </div>
                      {p.location && (
                        <div style={{ fontSize:12, color:'var(--tx3)', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          {p.location}
                        </div>
                      )}
                      <div style={{ display:'flex', gap:16, fontSize:11, color:'var(--tx3)', flexWrap:'wrap' }}>
                        {p.total_area && <span>Area: {fmt(p.total_area)} sq.ft</span>}
                        {p.base_price_sqft && <span>BSP: ₹{fmt(p.base_price_sqft)}/sq.ft</span>}
                        {p.launch_date && <span>Launched: {fmtD(p.launch_date)}</span>}
                      </div>
                    </div>

                    {/* Plot status grid */}
                    <div style={{ display:'flex', gap:8 }}>
                      <PlotMini label="Available" count={s.available || 0} color="#10B981" />
                      <PlotMini label="Booked"    count={s.booked   || 0} color="#6366F1" />
                      <PlotMini label="Hold"      count={s.hold     || 0} color="#F59E0B" />
                      <PlotMini label="Sold Out"  count={s.sold_out || 0} color="#F43F5E" />
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setModal(p)}>Edit</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setImportModal(p)}>
                        + Import Plots
                      </button>
                      {isSuperAdmin && p.status !== 'archived' && (
                        <button className="btn btn-sm" style={{ background:'var(--rose-l)', color:'var(--rose)', border:'none' }}
                          onClick={() => handleArchive(p.id)}>Archive</button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {total > 0 && (
                    <div style={{ marginTop:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:5, color:'var(--tx3)' }}>
                        <span>{total} total plots</span>
                        <span style={{ fontWeight:600, color:'var(--rose)' }}>{pct}% sold</span>
                      </div>
                      <div className="progress">
                        <div className="progress-fill" style={{ width:`${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <ProjectModal
          editing={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
      {importModal && (
        <BulkImportModal
          project={importModal}
          onClose={() => setImportModal(null)}
          onDone={load}
        />
      )}
    </>
  );
}
