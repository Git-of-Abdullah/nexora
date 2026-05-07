'use client';

import { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { Plus, Search, RefreshCw, Pencil, Trash2, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const PIPELINE_STAGES = ['New','Contacted','Qualified','Proposal Sent','Won','Lost'];
const LEAD_SOURCES    = ['Website','Referral','Cold Call','Email','Social Media','Trade Show','Partner','Other'];

/* ── Module-level form — prevents focus loss ── */
function LeadForm({ form, setForm, formError, campaigns, isEdit }) {
  return (
    <>
      {formError && <div className="alert alert-error" style={{display:'flex',alignItems:'center',gap:8}}><AlertCircle size={15}/> {formError}</div>}
      <div className="form-row">
        <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" placeholder="Jane Smith" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" placeholder="jane@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="+1 555 0100" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Source</label>
          <select className="form-select" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
            {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {isEdit && (
        <div className="form-group"><label className="form-label">Pipeline Stage</label>
          <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
            {PIPELINE_STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      )}
      <div className="form-group"><label className="form-label">Campaign</label>
        <select className="form-select" value={form.campaignId} onChange={e => setForm(p => ({ ...p, campaignId: e.target.value }))}>
          <option value="">None</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    </>
  );
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d) { if (!d) return '—'; const dt = new Date(d); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; }

const EMPTY_FORM = { name: '', email: '', phone: '', source: 'Website', assignedTo: '', campaignId: '' };

/* ── Kanban column ── */
function KanbanCol({ stage, leads, onMove, onEdit }) {
  const colColors = {
    'New':           'var(--accent)',
    'Contacted':     '#4338CA',
    'Qualified':     '#7C3AED',
    'Proposal Sent': 'var(--warning)',
    'Won':           'var(--success)',
    'Lost':          'var(--danger)',
  };
  const color = colColors[stage] || 'var(--accent)';

  return (
    <div style={{
      minWidth: 200, flex: '1 1 180px',
      background: 'var(--bg)', borderRadius: 10,
      border: '1px solid var(--border)', overflow: 'hidden',
    }}>
      {/* Column header */}
      <div style={{ padding: '10px 12px', borderBottom: '2px solid ' + color, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color }}>{stage}</span>
        <span style={{ background: color + '20', color, fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>{leads.length}</span>
      </div>
      {/* Cards */}
      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 80 }}>
        {leads.map(lead => (
          <div key={lead.id} style={{
            background: 'var(--surface)', borderRadius: 7,
            border: '1px solid var(--border)', padding: '10px 10px',
            cursor: 'pointer', transition: 'box-shadow 0.15s',
          }}
          onClick={() => onEdit(lead)}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{lead.name}</div>
            {lead.email && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>{lead.email}</div>}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {lead.source && <span style={{ fontSize: '0.65rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', color: 'var(--text-muted)' }}>{lead.source}</span>}
              {lead.campaign && <span style={{ fontSize: '0.65rem', background: 'var(--accent-light)', borderRadius: 4, padding: '1px 5px', color: 'var(--accent)' }}>{lead.campaign.name}</span>}
            </div>
            {/* Move buttons */}
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {PIPELINE_STAGES.indexOf(stage) > 0 && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                  onClick={e => { e.stopPropagation(); onMove(lead, PIPELINE_STAGES[PIPELINE_STAGES.indexOf(stage) - 1]); }}
                >← Back</button>
              )}
              {PIPELINE_STAGES.indexOf(stage) < PIPELINE_STAGES.length - 1 && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                  onClick={e => { e.stopPropagation(); onMove(lead, PIPELINE_STAGES[PIPELINE_STAGES.indexOf(stage) + 1]); }}
                >Next →</button>
              )}
            </div>
          </div>
        ))}
        {leads.length === 0 && (
          <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>No leads</div>
        )}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const { user } = useAuth();
  const isMarketingRole = ['super_admin','marketing_manager','marketing_staff'].includes(user?.role);
  const canDelete = ['super_admin','marketing_manager'].includes(user?.role);
  
  // Redirect non-marketing users
  useEffect(() => {
    if (user && !isMarketingRole) {
      window.location.href = '/dashboard';
    }
  }, [user, isMarketingRole]);
  
  if (!isMarketingRole) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Unauthorized access</div>;
  }
  
  const [leads,      setLeads]     = useState([]);
  const [campaigns,  setCampaigns] = useState([]);
  const [users,      setUsers]     = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [view,       setView]      = useState('pipeline'); // 'pipeline' | 'table'
  const [search,     setSearch]    = useState('');
  const [filterSrc,  setFSrc]      = useState('');

  const [addOpen,      setAddOpen]   = useState(false);
  const [editTarget,   setEditTarget]= useState(null);
  const [deleteTarget, setDelTarget] = useState(null);
  const [form,         setForm]      = useState(EMPTY_FORM);
  const [saving,       setSaving]    = useState(false);
  const [formError,    setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lv, camps] = await Promise.all([
        api.get('/marketing/leads'),
        api.get('/marketing/campaigns'),
      ]);
      setLeads(lv);
      setCampaigns(camps);
    } catch { setLeads([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchQ = !q || l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q);
    const matchS = !filterSrc || l.source === filterSrc;
    return matchQ && matchS;
  });

  /* ── Create ── */
  async function handleCreate() {
    setFormError(''); setSaving(true);
    try {
      const created = await api.post('/marketing/leads', {
        name:       form.name,
        email:      form.email       || undefined,
        phone:      form.phone       || undefined,
        source:     form.source      || undefined,
        assignedTo: form.assignedTo  || undefined,
        campaignId: form.campaignId  || undefined,
      });
      setLeads(prev => [created, ...prev]);
      setAddOpen(false); setForm(EMPTY_FORM);
    } catch (err) { setFormError(err?.error || 'Failed to create lead.'); }
    finally { setSaving(false); }
  }

  /* ── Update ── */
  async function handleUpdate() {
    setFormError(''); setSaving(true);
    try {
      const updated = await api.patch(`/marketing/leads/${editTarget.id}`, {
        name:       form.name       || undefined,
        email:      form.email      || undefined,
        phone:      form.phone      || undefined,
        source:     form.source     || undefined,
        status:     form.status     || undefined,
        assignedTo: form.assignedTo || undefined,
        campaignId: form.campaignId || undefined,
      });
      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
      setEditTarget(null);
    } catch (err) { setFormError(err?.error || 'Failed to update lead.'); }
    finally { setSaving(false); }
  }

  /* ── Move stage (pipeline) ── */
  async function handleMove(lead, newStatus) {
    try {
      const updated = await api.patch(`/marketing/leads/${lead.id}/status`, { status: newStatus });
      setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, status: updated.status } : l));
    } catch (err) { alert(err?.error || 'Failed to move lead.'); }
  }

  /* ── Delete ── */
  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/marketing/leads/${deleteTarget.id}`);
      setLeads(prev => prev.filter(l => l.id !== deleteTarget.id));
      setDelTarget(null);
    } catch (err) { alert(err?.error || 'Failed to delete lead.'); }
    finally { setSaving(false); }
  }

  function openEdit(lead) {
    setEditTarget(lead);
    setForm({
      name:       lead.name       || '',
      email:      lead.email      || '',
      phone:      lead.phone      || '',
      source:     lead.source     || 'Website',
      status:     lead.status     || 'New',
      assignedTo: lead.assignedTo ? String(lead.assignedTo) : '',
      campaignId: lead.campaignId ? String(lead.campaignId) : '',
    });
    setFormError('');
  }

  // LeadForm is now module-level above

  const won  = leads.filter(l => l.status === 'Won').length;
  const lost = leads.filter(l => l.status === 'Lost').length;
  const convRate = leads.length > 0 ? Math.round((won / leads.length) * 100) : 0;

  return (
    <div className="page-wrapper">
      <Topbar title="Lead Pipeline" subtitle="CRM — manage and advance your leads through the sales funnel" />
      <main className="page-main">

        {/* Summary */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: 'Total Leads', value: leads.length,  cls: 'badge-neutral' },
            { label: 'Won',         value: won,            cls: 'badge-success' },
            { label: 'Lost',        value: lost,           cls: 'badge-danger'  },
            { label: 'Conv. Rate',  value: `${convRate}%`, cls: 'badge-accent'  },
          ].map(({ label, value, cls }) => (
            <div key={label} className={`badge ${cls}`} style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
              {label}: <strong style={{ marginLeft: 4 }}>{value}</strong>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="filters-row" style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={filterSrc} onChange={e => setFSrc(e.target.value)}>
            <option value="">All Sources</option>
            {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setView('pipeline')} className={`btn btn-sm ${view === 'pipeline' ? 'btn-primary' : 'btn-ghost'}`} style={{ borderRadius: 0 }}>Pipeline</button>
            <button onClick={() => setView('table')}    className={`btn btn-sm ${view === 'table'    ? 'btn-primary' : 'btn-ghost'}`} style={{ borderRadius: 0 }}>Table</button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-primary btn-sm" onClick={() => { setAddOpen(true); setForm(EMPTY_FORM); setFormError(''); }}>
            <Plus size={14} /> Add Lead
          </button>
        </div>

        {/* Pipeline / Kanban view */}
        {view === 'pipeline' ? (
          loading ? (
            <div className="card"><div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading pipeline…</div></div>
          ) : (
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
              {PIPELINE_STAGES.map(stage => (
                <KanbanCol
                  key={stage}
                  stage={stage}
                  leads={filtered.filter(l => l.status === stage)}
                  onMove={handleMove}
                  onEdit={openEdit}
                />
              ))}
            </div>
          )
        ) : (
          /* Table view */
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Leads</div><div className="card-subtitle">{filtered.length} of {leads.length}</div></div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Source</th><th>Campaign</th><th>Stage</th><th style={{ width: 90 }}>Actions</th></tr></thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4, width: '70%' }} /></td>
                      ))}</tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState icon={UserPlus} title="No leads found" message="Add leads to start your pipeline." /></td></tr>
                  ) : filtered.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600 }}>{l.name}</td>
                      <td className="td-muted">{l.email || '—'}</td>
                      <td className="td-muted">{l.phone || '—'}</td>
                      <td><span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}><span className="badge-dot" />{l.source || '—'}</span></td>
                      <td className="td-muted">{l.campaign?.name || '—'}</td>
                      <td><Badge status={l.status} /></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(l)}><Pencil size={13} /></button>
                          {canDelete && <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setDelTarget(l)}><Trash2 size={13} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Lead" size="md"
          footer={<><button className="btn btn-secondary btn-sm" onClick={() => setAddOpen(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>{saving ? 'Saving…' : 'Add Lead'}</button></>}
        ><LeadForm form={form} setForm={setForm} formError={formError} campaigns={campaigns} isEdit={false} /></Modal>

        <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit Lead — ${editTarget?.name}`} size="md"
          footer={<><button className="btn btn-secondary btn-sm" onClick={() => setEditTarget(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleUpdate} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button></>}
        ><LeadForm form={form} setForm={setForm} formError={formError} campaigns={campaigns} isEdit={true} /></Modal>

        <ConfirmModal open={!!deleteTarget} onClose={() => setDelTarget(null)} onConfirm={handleDelete}
          title="Delete Lead" message={`Delete lead "${deleteTarget?.name}"? This cannot be undone.`} loading={saving} />
      </main>
    </div>
  );
}
