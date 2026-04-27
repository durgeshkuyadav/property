import { useState, useEffect, useCallback } from 'react';
import { plotAPI, projectAPI } from '../utils/api';
import Topbar from '../components/layout/Topbar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  available: { label:'Available', bg:'#0A7C4E', light:'#D6F5E8', text:'#054D30' },
  hold:      { label:'Hold',      bg:'#C07000', light:'#FFF3CD', text:'#7A4400' },
  booked:    { label:'Booked',    bg:'#1565C0', light:'#E3F0FF', text:'#0D3C7A' },
  sold_out:  { label:'Sold Out',  bg:'#C0392B', light:'#FDECEA', text:'#7A1F15' },
};

const PLOT_CATEGORIES = [
  'Corner East Phase','Corner West Phase','Corner South Phase','Corner North Phase',
  'Corner East Phase, Front of Park','Corner West Phase, Front Of Park',
  'Corner South Phase, Front Of Park','Corner North Phase, Front of park',
  'Intermittent Plot','Intermittent Plot East Phase','Intermittent Plot West Phase',
  'Intermittent Plot South Phase','Intermittent Plot North Phase',
  'Intermittent Plot East Phase, Front Of Park','Intermittent Plot West Phase, Front Of Park',
  'Intermittent Plot South Phase, Front Of Park','Intermittent Plot North Phase, Front Of Park',
  'Corner East Front Of Resort','Corner West Front Of Resort','Corner South Front Of Resort',
];

const fmt = n => new Intl.NumberFormat('en-IN').format(Math.round(n||0));

const PlotCard = ({ plot, onSelect, selected, onStatusChange, isAdmin }) => {
  const cfg = STATUS_CONFIG[plot.status] || STATUS_CONFIG.available;
  return (
    <div
      onClick={() => onSelect(plot)}
      title={`Plot ${plot.plot_number} — ${plot.status}`}
      style={{
        width:52, height:52, borderRadius:7, cursor:'pointer',
        background: selected ? '#1A1A2E' : cfg.bg,
        border: selected ? '2px solid var(--gold)' : `1px solid ${cfg.bg}`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        transition:'all .12s', flexShrink:0,
        boxShadow: selected ? '0 0 0 3px rgba(184,134,11,0.3)' : 'none',
      }}
    >
      <div style={{ fontSize:9, fontWeight:700, color:'#fff', lineHeight:1.2, textAlign:'center', padding:'0 2px', wordBreak:'break-all' }}>
        {plot.plot_number}
      </div>
      <div style={{ fontSize:8, color:'rgba(255,255,255,0.75)', marginTop:1 }}>
        {plot.dimension_sqft}
      </div>
    </div>
  );
};

export default function PlotStatusPage() {
  const { isAdmin } = useAuth();
  const [projects, setProjects]     = useState([]);
  const [plots, setPlots]           = useState([]);
  const [summary, setSummary]       = useState({});
  const [filterOpts, setFilterOpts] = useState({ categories:[], dimensions:[], blocks:[], facings:[] });
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [view, setView]             = useState('grid'); // grid | table
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({});
  const [showAddPlot, setShowAddPlot]   = useState(false);
  const [showBulk, setShowBulk]         = useState(false);
  const [bulkText, setBulkText]         = useState('');
  const [savingBulk, setSavingBulk]     = useState(false);

  const [filters, setFilters] = useState({
    project_id:'', status:'', plot_category:'', dimension_sqft:'', block_code:'', search:''
  });

  const [plotForm, setPlotForm] = useState({
    project_id:'', plot_number:'', block_code:'', dimension_sqft:'',
    plot_category:'', plot_facing:'', bsp_per_sqft:'', plc_charges:'0'
  });

  useEffect(() => {
    projectAPI.getAll({ status:'active' }).then(r => setProjects(r.data.data || []));
  }, []);

  useEffect(() => {
    // Load filter options always, optionally scoped to project
    const params = {};
    if (filters.project_id) params.project_id = filters.project_id;
    plotAPI.getFilterOpts(params)
      .then(r => setFilterOpts(r.data.data || { categories:[], dimensions:[], blocks:[], facings:[] }))
      .catch(() => {});
  }, [filters.project_id]);

  const loadPlots = useCallback(() => {
    setLoading(true);
    const params = { ...filters, page, limit: view==='grid' ? 200 : 20 };
    Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });

    Promise.all([
      plotAPI.getAll(params),
      plotAPI.getSummary({ project_id: filters.project_id||undefined, status: filters.status||undefined }),
    ]).then(([plotsRes, sumRes]) => {
      setPlots(plotsRes.data.data || []);
      setPagination(plotsRes.data.pagination || {});
      setSummary(sumRes.data.data || {});
    }).catch(console.error).finally(() => setLoading(false));
  }, [filters, page, view]);

  useEffect(() => { loadPlots(); }, [loadPlots]);

  const setFilter = (k, v) => { setFilters(f => ({...f, [k]: v})); setPage(1); };

  const handleStatusChange = async (plotId, newStatus) => {
    try {
      await plotAPI.changeStatus(plotId, { status: newStatus });
      toast.success(`Status changed to ${newStatus}`);
      if (selected?.id === plotId) setSelected(s => ({...s, status: newStatus}));
      loadPlots();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleCreatePlot = async (e) => {
    e.preventDefault();
    if (!plotForm.project_id || !plotForm.plot_number || !plotForm.dimension_sqft || !plotForm.bsp_per_sqft) {
      toast.error('Fill all required fields'); return;
    }
    try {
      await plotAPI.create({ ...plotForm, dimension_sqft: parseFloat(plotForm.dimension_sqft), bsp_per_sqft: parseFloat(plotForm.bsp_per_sqft), plc_charges: parseFloat(plotForm.plc_charges||0) });
      toast.success('Plot added!');
      setShowAddPlot(false);
      setPlotForm({ project_id:filters.project_id||'', plot_number:'', block_code:'', dimension_sqft:'', plot_category:'', plot_facing:'', bsp_per_sqft:'', plc_charges:'0' });
      loadPlots();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleBulkImport = async () => {
    setSavingBulk(true);
    try {
      const lines = bulkText.trim().split('\n').filter(Boolean);
      const plotsData = lines.map(line => {
        const [plot_number, dimension_sqft, bsp_per_sqft, plot_category, block_code, plot_facing] = line.split(',').map(s => s.trim());
        return { plot_number, dimension_sqft: parseFloat(dimension_sqft), bsp_per_sqft: parseFloat(bsp_per_sqft), plot_category: plot_category||null, block_code: block_code||null, plot_facing: plot_facing||null };
      });
      if (!filters.project_id) { toast.error('Select a project first'); return; }
      const { data } = await plotAPI.bulkCreate({ project_id: parseInt(filters.project_id), plots: plotsData });
      toast.success(`Imported! Created: ${data.data.created}, Skipped: ${data.data.skipped}`);
      setShowBulk(false); setBulkText(''); loadPlots();
    } catch (err) { toast.error(err.response?.data?.message || 'Import failed'); }
    finally { setSavingBulk(false); }
  };

  return (
    <>
      <Topbar title="Plot Status" subtitle="Inventory overview across all projects">
        <div style={{ display:'flex', gap:6 }}>
          <button className={`btn btn-sm ${view==='grid'?'btn-primary':'btn-outline'}`} onClick={() => setView('grid')}>Grid View</button>
          <button className={`btn btn-sm ${view==='table'?'btn-primary':'btn-outline'}`} onClick={() => setView('table')}>Table View</button>
          {isAdmin && <button className="btn btn-sm btn-secondary" onClick={() => setShowAddPlot(true)}>+ Add Plot</button>}
          {isAdmin && filters.project_id && <button className="btn btn-sm btn-outline" onClick={() => setShowBulk(true)}>Bulk Import</button>}
        </div>
      </Topbar>

      <div className="page-body">
        {/* Status Pills */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:14 }}>
          {[
            { label:'Total Plots', val: summary.total||0, bg:'#5B4FBE', light:'#EEEDFE' },
            { label:'Available',   val: summary.available||0, bg: STATUS_CONFIG.available.bg, light: STATUS_CONFIG.available.light },
            { label:'Hold',        val: summary.hold||0,      bg: STATUS_CONFIG.hold.bg,      light: STATUS_CONFIG.hold.light },
            { label:'Booked',      val: summary.booked||0,    bg: STATUS_CONFIG.booked.bg,    light: STATUS_CONFIG.booked.light },
            { label:'Sold Out',    val: summary.sold_out||0,  bg: STATUS_CONFIG.sold_out.bg,  light: STATUS_CONFIG.sold_out.light },
          ].map(({ label, val, bg, light }) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:8, background:bg, borderRadius:8, padding:'8px 14px', cursor: label==='Total Plots' ? 'default' : 'pointer' }}
              onClick={() => label !== 'Total Plots' && setFilter('status', filters.status === label.toLowerCase().replace(' ','_') ? '' : label.toLowerCase().replace(' ','_'))}>
              <div style={{ fontSize:18, fontWeight:700, color:'#fff' }}>{val}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.85)', fontWeight:600 }}>{label}</div>
              {label !== 'Total Plots' && filters.status === label.toLowerCase().replace(' ','_') && (
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.7)' }}>✓</div>
              )}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom:14 }}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div style={{ flex:'0 0 180px' }}>
              <div className="form-label">Project</div>
              <select className="form-input" value={filters.project_id} onChange={e => setFilter('project_id', e.target.value)}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              </select>
            </div>
            <div style={{ flex:'0 0 140px' }}>
              <div className="form-label">Status</div>
              <select className="form-input" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
                <option value="">----ALL----</option>
                <option value="available">Available</option>
                <option value="hold">Hold</option>
                <option value="booked">Booked</option>
                <option value="sold_out">Sold Out</option>
              </select>
            </div>
            <div style={{ flex:'0 0 160px' }}>
              <div className="form-label">Plot Category</div>
              <select className="form-input" value={filters.plot_category} onChange={e => setFilter('plot_category', e.target.value)}>
                <option value="">-- All Categories --</option>
                {(filterOpts.categories.length ? filterOpts.categories : PLOT_CATEGORIES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ flex:'0 0 120px' }}>
              <div className="form-label">Dimension</div>
              <select className="form-input" value={filters.dimension_sqft} onChange={e => setFilter('dimension_sqft', e.target.value)}>
                <option value="">-- All --</option>
                {filterOpts.dimensions.map(d => <option key={d} value={d}>{d} sq/ft</option>)}
              </select>
            </div>
            <div style={{ flex:'0 0 110px' }}>
              <div className="form-label">Block Code</div>
              <select className="form-input" value={filters.block_code} onChange={e => setFilter('block_code', e.target.value)}>
                <option value="">-- All --</option>
                {filterOpts.blocks.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{ flex:1, minWidth:130 }}>
              <div className="form-label">Search Plot No.</div>
              <input className="form-input" placeholder="e.g. J202" value={filters.search} onChange={e => setFilter('search', e.target.value)} />
            </div>
            <button className="btn btn-outline btn-sm" style={{ marginBottom:1 }} onClick={() => { setFilters({ project_id:'', status:'', plot_category:'', dimension_sqft:'', block_code:'', search:'' }); setPage(1); }}>
              Clear
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:12, fontSize:11 }}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:14, height:14, borderRadius:3, background:cfg.bg }}/>
              <span style={{ color:'var(--ink2)' }}>{cfg.label}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner"/></div>
        ) : plots.length === 0 ? (
          <div className="card"><div className="empty-state">No plots found. Select a project and add plots to get started.</div></div>
        ) : view === 'grid' ? (
          /* GRID VIEW */
          <div className="card">
            <div className="card-header">
              <div className="card-title">Plot Grid Map — {pagination.total || plots.length} plots</div>
              {!filters.project_id && <span style={{ fontSize:11, color:'var(--ink3)' }}>Select a project for better view</span>}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:4 }}>
              {plots.map(plot => (
                <PlotCard key={plot.id} plot={plot} selected={selected?.id === plot.id} onSelect={setSelected} onStatusChange={handleStatusChange} isAdmin={isAdmin} />
              ))}
            </div>
            {selected && (
              <div style={{ marginTop:16, padding:14, background:'#F4F4FA', borderRadius:10, border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>Plot {selected.plot_number} — {selected.project_name}</div>
                  <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'var(--ink3)', cursor:'pointer', fontSize:18 }}>×</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:8, marginBottom:12 }}>
                  {[
                    ['Plot Number', selected.plot_number],
                    ['Dimension', `${selected.dimension_sqft} sq.ft`],
                    ['BSP/sq.ft', `₹${fmt(selected.bsp_per_sqft)}`],
                    ['Total Price', `₹${fmt(selected.calculated_total)}`],
                    ['Block Code', selected.block_code || '—'],
                    ['Category', selected.plot_category || '—'],
                    ['Facing', selected.plot_facing || '—'],
                    ['PLC Charges', `₹${fmt(selected.plc_charges)}`],
                  ].map(([l, v]) => (
                    <div key={l} style={{ background:'var(--card)', borderRadius:8, padding:'8px 10px' }}>
                      <div style={{ fontSize:9, color:'var(--ink3)', marginBottom:2 }}>{l}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize:12, color:'var(--ink3)' }}>Current status:</div>
                  <span style={{ background: STATUS_CONFIG[selected.status]?.bg, color:'#fff', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                    {STATUS_CONFIG[selected.status]?.label}
                  </span>
                  {isAdmin && selected.status !== 'booked' && selected.status !== 'sold_out' && (
                    <div style={{ display:'flex', gap:6 }}>
                      {Object.entries(STATUS_CONFIG).filter(([k]) => k !== selected.status && k !== 'booked' && k !== 'sold_out').map(([k, cfg]) => (
                        <button key={k} className="btn btn-sm" style={{ background:cfg.light, color:cfg.text, border:'none' }} onClick={() => handleStatusChange(selected.id, k)}>
                          → {cfg.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="card">
            <div className="card-header">
              <div className="card-title">Plot List — {pagination.total || 0} plots</div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Plot No.</th><th>Project</th><th>Block</th><th>Dimension</th><th>Category</th><th>Facing</th><th>BSP/sq.ft</th><th>Total Price</th><th>PLC</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr>
                </thead>
                <tbody>
                  {plots.map(p => {
                    const cfg = STATUS_CONFIG[p.status];
                    return (
                      <tr key={p.id}>
                        <td><strong style={{ color:'var(--ink)' }}>{p.plot_number}</strong></td>
                        <td style={{ fontSize:11 }}>{p.project_name}</td>
                        <td>{p.block_code || '—'}</td>
                        <td>{p.dimension_sqft} sq.ft</td>
                        <td style={{ fontSize:11, maxWidth:150 }}>{p.plot_category || '—'}</td>
                        <td>{p.plot_facing || '—'}</td>
                        <td>₹{fmt(p.bsp_per_sqft)}</td>
                        <td><strong>₹{fmt(p.calculated_total)}</strong></td>
                        <td>{p.plc_charges > 0 ? `₹${fmt(p.plc_charges)}` : '—'}</td>
                        <td><span style={{ background:cfg?.bg, color:'#fff', padding:'2px 9px', borderRadius:20, fontSize:10, fontWeight:700 }}>{cfg?.label || p.status}</span></td>
                        {isAdmin && (
                          <td>
                            {p.status === 'available' && <button className="btn btn-sm" style={{ background:'#FFF3CD', color:'#7A4400', border:'none' }} onClick={() => handleStatusChange(p.id,'hold')}>Hold</button>}
                            {p.status === 'hold' && <button className="btn btn-sm" style={{ background:'var(--greenl)', color:'var(--greend)', border:'none' }} onClick={() => handleStatusChange(p.id,'available')}>Release</button>}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:12, marginTop:10, borderTop:'1px solid var(--border)', fontSize:12 }}>
                <span style={{ color:'var(--ink3)' }}>Page {pagination.page} of {pagination.totalPages}</span>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-outline btn-sm" disabled={!pagination.hasPrev} onClick={() => setPage(p=>p-1)}>← Prev</button>
                  <button className="btn btn-outline btn-sm" disabled={!pagination.hasNext} onClick={() => setPage(p=>p+1)}>Next →</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Plot Modal */}
      {showAddPlot && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'var(--card)', borderRadius:16, padding:24, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>Add New Plot</div>
              <button onClick={() => setShowAddPlot(false)} style={{ background:'none', border:'none', fontSize:22, color:'var(--ink3)', cursor:'pointer' }}>×</button>
            </div>
            <form onSubmit={handleCreatePlot}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Project *</label>
                  <select className="form-input" value={plotForm.project_id} onChange={e => setPlotForm(f=>({...f,project_id:e.target.value}))} required>
                    <option value="">Select Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Plot Number *</label>
                  <input className="form-input" value={plotForm.plot_number} onChange={e => setPlotForm(f=>({...f,plot_number:e.target.value}))} placeholder="e.g. J202" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Block Code</label>
                  <input className="form-input" value={plotForm.block_code} onChange={e => setPlotForm(f=>({...f,block_code:e.target.value}))} placeholder="e.g. Block-A" />
                </div>
                <div className="form-group">
                  <label className="form-label">Dimension (sq.ft) *</label>
                  <input className="form-input" type="number" value={plotForm.dimension_sqft} onChange={e => setPlotForm(f=>({...f,dimension_sqft:e.target.value}))} placeholder="e.g. 499" step="0.01" required />
                </div>
                <div className="form-group">
                  <label className="form-label">BSP per sq.ft (₹) *</label>
                  <input className="form-input" type="number" value={plotForm.bsp_per_sqft} onChange={e => setPlotForm(f=>({...f,bsp_per_sqft:e.target.value}))} placeholder="e.g. 499" step="0.01" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Plot Category</label>
                  <select className="form-input" value={plotForm.plot_category} onChange={e => setPlotForm(f=>({...f,plot_category:e.target.value}))}>
                    <option value="">-- Select --</option>
                    {PLOT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Facing</label>
                  <select className="form-input" value={plotForm.plot_facing} onChange={e => setPlotForm(f=>({...f,plot_facing:e.target.value}))}>
                    <option value="">-- Select --</option>
                    {['East','West','North','South','North-East','North-West','South-East','South-West'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">PLC Charges (₹)</label>
                  <input className="form-input" type="number" value={plotForm.plc_charges} onChange={e => setPlotForm(f=>({...f,plc_charges:e.target.value}))} placeholder="0" step="0.01" />
                </div>
              </div>
              {plotForm.dimension_sqft && plotForm.bsp_per_sqft && (
                <div style={{ background:'var(--goldl)', borderRadius:8, padding:'10px 12px', marginBottom:12, fontSize:12, color:'var(--amber)', fontWeight:600 }}>
                  Calculated Total: ₹{fmt(parseFloat(plotForm.dimension_sqft||0) * parseFloat(plotForm.bsp_per_sqft||0))}
                </div>
              )}
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddPlot(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Plot</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulk && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'var(--card)', borderRadius:16, padding:24, width:'100%', maxWidth:560 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>Bulk Import Plots</div>
              <button onClick={() => setShowBulk(false)} style={{ background:'none', border:'none', fontSize:22, color:'var(--ink3)', cursor:'pointer' }}>×</button>
            </div>
            <div style={{ background:'var(--goldl)', borderRadius:8, padding:'10px 12px', marginBottom:14, fontSize:11, color:'var(--amber)' }}>
              <strong>Format (one plot per line, comma separated):</strong><br />
              PlotNo, Dimension, BSP, Category (optional), BlockCode (optional), Facing (optional)<br />
              <span style={{ opacity:0.8 }}>Example: J202,499,499,Corner East Phase,Block-A,East</span>
            </div>
            <textarea
              className="form-input" rows={10} value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder="J202,499,499,Corner East Phase,Block-A,East&#10;L501,600,499,Intermittent Plot,Block-B,North&#10;C12,599,1000,Corner West Phase,Block-C,West"
              style={{ fontFamily:'monospace', fontSize:11 }}
            />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
              <button className="btn btn-outline" onClick={() => setShowBulk(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBulkImport} disabled={savingBulk || !bulkText.trim()}>
                {savingBulk ? 'Importing...' : `Import ${bulkText.trim().split('\n').filter(Boolean).length} Plots`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
