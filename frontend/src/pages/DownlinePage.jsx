import { useState, useEffect, useCallback } from 'react';
import { associateAPI } from '../utils/api';
import Topbar from '../components/layout/Topbar';
import toast from 'react-hot-toast';

const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmt  = n => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));

const ROLE_BADGE = {
  super_admin:   { bg:'#FEE2E2', color:'#991B1B', label:'Super Admin' },
  manager:       { bg:'#FEF3C7', color:'#92400E', label:'Manager' },
  associate:     { bg:'#EEF2FF', color:'#3730A3', label:'Associate' },
  sub_associate: { bg:'#F1F5F9', color:'#475569', label:'Sub-Associate' },
};

export default function DownlinePage() {
  const [rows, setRows]         = useState([]);
  const [pagination, setPag]    = useState({});
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    associateAPI.getDownlineFlat(null, { search, page, limit: 20 })
      .then(r => {
        setRows(r.data.data || []);
        setPag(r.data.pagination || {});
      })
      .catch(() => toast.error('Failed to load team'))
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const total = pagination.total || 0;
  const totalPages = pagination.totalPages || 1;

  return (
    <>
      <Topbar title="My Team" subtitle={`${total} total members in your downline`}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text" placeholder="Search ID, Name, Mobile, Email, PAN..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                padding:'8px 12px 8px 32px', borderRadius:10, border:'1.5px solid rgba(148,163,184,0.3)',
                fontSize:12, width:280, background:'rgba(255,255,255,0.8)', backdropFilter:'blur(8px)',
                outline:'none', transition:'all .2s',
              }}
              onFocus={e => { e.target.style.borderColor='#6366F1'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.1)'; }}
              onBlur={e => { e.target.style.borderColor='rgba(148,163,184,0.3)'; e.target.style.boxShadow='none'; }}
            />
          </div>
          <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
        </div>
      </Topbar>

      <div className="page-body">
        {/* Summary pills */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          {[
            { l:'Total Members', v: total, bg:'#EEF2FF', c:'#4338CA' },
            { l:'Pages',         v: `${page} / ${totalPages}`, bg:'#F0FDF4', c:'#166534' },
            { l:'Per Page',      v: 20, bg:'#FFF7ED', c:'#9A3412' },
          ].map(s => (
            <div key={s.l} style={{ background:s.bg, borderRadius:99, padding:'6px 16px', display:'flex', gap:8, alignItems:'center', border:`1px solid ${s.c}22` }}>
              <span style={{ fontSize:10.5, fontWeight:700, color:s.c, opacity:0.7, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.l}</span>
              <span style={{ fontSize:13, fontWeight:800, color:s.c }}>{s.v}</span>
            </div>
          ))}
        </div>

        <div className="card glass-card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
            ) : rows.length === 0 ? (
              <div className="empty-state" style={{ padding:60 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity:.35 }}>
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
                No team members found
              </div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    {['#','Prom. ID','Name','Mobile No.','Date of Join','Sponsor','Per(%)','Profile','Address'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m, i) => {
                    const rb = ROLE_BADGE[m.role] || ROLE_BADGE.associate;
                    return (
                      <tr key={m.id}>
                        <td style={{ color:'#94A3B8', fontWeight:600, fontSize:11 }}>
                          {(page-1)*20 + i + 1}
                        </td>
                        <td>
                          <span style={{ fontWeight:700, color:'#4F46E5', fontFamily:'monospace', fontSize:12 }}>
                            {m.associate_code}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{
                              width:30, height:30, borderRadius:'50%', flexShrink:0,
                              background:'linear-gradient(135deg,#6366F1,#8B5CF6)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:11, fontWeight:700, color:'#fff',
                            }}>
                              {m.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight:600, color:'#0F172A', fontSize:12 }}>{m.name}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily:'monospace', fontSize:12, color:'#334155' }}>{m.mobile}</td>
                        <td style={{ color:'#64748B', fontSize:11.5 }}>{fmtD(m.joining_date)}</td>
                        <td style={{ fontSize:11 }}>
                          {m.sponsor_name ? (
                            <div>
                              <div style={{ fontWeight:600, color:'#334155', fontSize:11 }}>{m.sponsor_code}</div>
                              <div style={{ color:'#94A3B8', fontSize:10 }}>{m.sponsor_name}</div>
                            </div>
                          ) : '—'}
                        </td>
                        <td>
                          <span style={{
                            background: m.commission_pct >= 8 ? '#D1FAE5' : '#EEF2FF',
                            color: m.commission_pct >= 8 ? '#065F46' : '#4338CA',
                            fontWeight:800, fontSize:12, padding:'3px 10px',
                            borderRadius:99, display:'inline-block',
                          }}>
                            {m.commission_pct}%
                          </span>
                        </td>
                        <td>
                          <span style={{ background:rb.bg, color:rb.color, fontWeight:700, fontSize:10, padding:'3px 9px', borderRadius:99 }}>
                            {rb.label}
                          </span>
                        </td>
                        <td style={{ fontSize:11, color:'#64748B', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {m.address || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={9} style={{ padding:'10px 14px', background:'rgba(99,102,241,0.04)', fontSize:11, color:'#64748B' }}>
                      Showing {rows.length} of {total} members
                      {search && <span style={{ color:'#4F46E5', fontWeight:600 }}> · filtered by "{search}"</span>}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:6, padding:16, borderTop:'1px solid rgba(148,163,184,0.1)' }}>
              <button className="btn btn-outline btn-sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
              {[...Array(Math.min(totalPages,7))].map((_,i)=>{
                const p = i + 1;
                return (
                  <button key={p} onClick={()=>setPage(p)}
                    className="btn btn-sm"
                    style={{ background: page===p ? '#4F46E5' : 'transparent', color: page===p ? '#fff' : '#64748B', border: page===p ? 'none' : '1.5px solid rgba(148,163,184,0.25)', minWidth:34 }}>
                    {p}
                  </button>
                );
              })}
              <button className="btn btn-outline btn-sm" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
