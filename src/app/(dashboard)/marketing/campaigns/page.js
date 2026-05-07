'use client';

import { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { Plus, Search, RefreshCw, Pencil, Trash2, Target, BarChart3, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d)  { if (!d) return '—'; const dt = new Date(d); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; }
function fmtMoney(n) { return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

const CAMP_STATUSES = ['Planning','Active','Paused','Ended'];
const CAMP_TYPES    = ['Email','Social Media','SEO','PPC','Influencer','Event','Print','Other'];

/* ── Module-level form — prevents focus loss ── */
function CampaignForm({ form, setForm, formError }) {
  return (
    <>
      {formError && <div className="alert alert-error" style={{display:'flex',alignItems:'center',gap:8}}><AlertCircle size={15}/> {formError}</div>}
      <div className="form-group"><label className="form-label">Campaign Name *</label><input className="form-input" placeholder="Summer Sale 2026" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Type</label>
          <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            {CAMP_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
            {CAMP_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group"><label className="form-label">Budget ($) *</label><input type="number" step="0.01" className="form-input" placeholder="5000" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Start Date *</label><input type="date" className="form-input" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">End Date *</label><input type="date" className="form-input" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} /></div>
      </div>
    </>
  );
}

const EMPTY_FORM    = { name: '', type: 'Email', status: 'Planning', budget: '', startDate: '', endDate: '' };

/* ── Metrics Panel ── */
function MetricsPanel({ campaign, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ impressions: '', clicks: '', conversions: '', revenue: '' });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get(`/marketing/metrics/${campaign.id}`)
      .then(setData).catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [campaign.id]);

  async function addMetric() {
    setError(''); setSaving(true);
    try {
      const result = await api.post(`/marketing/metrics/${campaign.id}`, {
        impressions:  parseInt(form.impressions  || 0),
        clicks:       parseInt(form.clicks       || 0),
        conversions:  parseInt(form.conversions  || 0),
        revenue:      parseFloat(form.revenue    || 0),
      });
      setData(prev => ({ ...prev, summary: result.summary, metrics: [result.metric, ...(prev?.metrics || [])] }));
      setForm({ impressions: '', clicks: '', conversions: '', revenue: '' });
    } catch (err) { setError(err?.error || 'Failed to save metrics.'); }
    finally { setSaving(false); }
  }

  const s = data?.summary;

  return (
    <Modal open onClose={onClose} title={`Metrics — ${campaign.name}`} size="lg"
      footer={<button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>}
    >
      {loading ? <div style={{ textAlign:'center', padding: 24, color: 'var(--text-muted)' }}>Loading metrics…</div> : (
        <>
          {/* Summary KPIs */}
          {s && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Impressions', value: Number(s.impressions).toLocaleString() },
                { label: 'Clicks',      value: Number(s.clicks).toLocaleString() },
                { label: 'CTR',         value: `${s.ctrPct}%` },
                { label: 'Conv. Rate',  value: `${s.conversionRatePct}%` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Log new metric */}
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Log New Metric Entry</div>
            {error && <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {['impressions','clicks','conversions','revenue'].map(field => (
                <div key={field} className="form-group">
                  <label className="form-label" style={{ textTransform: 'capitalize' }}>{field}</label>
                  <input type="number" className="form-input" placeholder="0" value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={addMetric} disabled={saving}>
              <BarChart3 size={13} /> {saving ? 'Saving…' : 'Log Metrics'}
            </button>
          </div>

          {/* Metrics history */}
          {data?.metrics?.length > 0 && (
            <div className="table-wrap">
              <table className="table" style={{ fontSize: '0.8rem' }}>
                <thead><tr><th>Impressions</th><th>Clicks</th><th>Conversions</th><th style={{ textAlign:'right' }}>Revenue</th></tr></thead>
                <tbody>
                  {data.metrics.map(m => (
                    <tr key={m.id}>
                      <td>{Number(m.impressions).toLocaleString()}</td>
                      <td>{Number(m.clicks).toLocaleString()}</td>
                      <td>{Number(m.conversions).toLocaleString()}</td>
                      <td style={{ textAlign:'right', fontWeight: 600 }}>${Number(m.revenue).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

export default function CampaignsPage() {
  const { user } = useAuth();
  const canManage = ['super_admin','marketing_manager'].includes(user?.role);
  const isMarketingRole = ['super_admin','marketing_manager','marketing_staff'].includes(user?.role);
  
  // Redirect non-marketing users
  useEffect(() => {
    if (user && !isMarketingRole) {
      window.location.href = '/dashboard';
    }
  }, [user, isMarketingRole]);
  
  if (!isMarketingRole) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Unauthorized access</div>;
  }
  
  const [campaigns,    setCampaigns]  = useState([]);
  const [loading,      setLoading]    = useState(true);
  const [search,       setSearch]     = useState('');
  const [filterStatus, setStatus]     = useState('');
  const [filterType,   setType]       = useState('');

  const [addOpen,      setAddOpen]    = useState(false);
  const [editTarget,   setEditTarget] = useState(null);
  const [deleteTarget, setDelTarget]  = useState(null);
  const [metricsFor,   setMetricsFor] = useState(null);
  const [form,         setForm]       = useState(EMPTY_FORM);
  const [saving,       setSaving]     = useState(false);
  const [formError,    setFormError]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setCampaigns(await api.get('/marketing/campaigns')); }
    catch { setCampaigns([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = campaigns.filter(c => {
    const matchQ = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchS = !filterStatus || c.status === filterStatus;
    const matchT = !filterType   || c.type   === filterType;
    return matchQ && matchS && matchT;
  });

  const totalBudget = campaigns.reduce((s, c) => s + Number(c.budget || 0), 0);

  async function handleCreate() {
    setFormError(''); setSaving(true);
    try {
      const created = await api.post('/marketing/campaigns', {
        name:      form.name,
        type:      form.type,
        status:    form.status,
        budget:    parseFloat(form.budget),
        startDate: form.startDate,
        endDate:   form.endDate,
      });
      setCampaigns(prev => [created, ...prev]);
      setAddOpen(false); setForm(EMPTY_FORM);
    } catch (err) { setFormError(err?.error || 'Failed to create campaign.'); }
    finally { setSaving(false); }
  }

  async function handleUpdate() {
    setFormError(''); setSaving(true);
    try {
      const updated = await api.patch(`/marketing/campaigns/${editTarget.id}`, {
        name:      form.name      || undefined,
        type:      form.type      || undefined,
        status:    form.status    || undefined,
        budget:    form.budget    ? parseFloat(form.budget) : undefined,
        startDate: form.startDate || undefined,
        endDate:   form.endDate   || undefined,
      });
      setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditTarget(null);
    } catch (err) { setFormError(err?.error || 'Failed to update campaign.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/marketing/campaigns/${deleteTarget.id}`);
      setCampaigns(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDelTarget(null);
    } catch (err) { alert(err?.error || 'Failed to delete campaign.'); }
    finally { setSaving(false); }
  }

  function openEdit(c) {
    setEditTarget(c);
    setForm({ name: c.name, type: c.type, status: c.status, budget: String(c.budget || ''), startDate: c.startDate?.split('T')[0] || '', endDate: c.endDate?.split('T')[0] || '' });
    setFormError('');
  }

  // CampaignForm is now module-level above

  return (
    <div className="page-wrapper">
      <Topbar title="Campaigns" subtitle="Campaign management & performance metrics" />
      <main className="page-main">

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Campaigns', value: campaigns.length,                                  cls: 'badge-neutral' },
            { label: 'Active',          value: campaigns.filter(c => c.status === 'Active').length, cls: 'badge-success' },
            { label: 'Total Budget',    value: fmtMoney(totalBudget),                             cls: 'badge-accent'  },
          ].map(({ label, value, cls }) => (
            <div key={label} className={`badge ${cls}`} style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
              {label}: <strong style={{ marginLeft: 4 }}>{value}</strong>
            </div>
          ))}
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={() => setStatus('')} className={`btn btn-sm ${!filterStatus ? 'btn-primary' : 'btn-secondary'}`}>All ({campaigns.length})</button>
          {CAMP_STATUSES.map(s => {
            const cnt = campaigns.filter(c => c.status === s).length;
            return <button key={s} onClick={() => setStatus(filterStatus === s ? '' : s)} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-secondary'}`}>{s} ({cnt})</button>;
          })}
        </div>

        {/* Toolbar */}
        <div className="filters-row" style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search campaigns…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={filterType} onChange={e => setType(e.target.value)}>
            <option value="">All Types</option>
            {CAMP_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
          {canManage && <button className="btn btn-primary btn-sm" onClick={() => { setAddOpen(true); setForm(EMPTY_FORM); setFormError(''); }}>
            <Plus size={14} /> New Campaign
          </button>}
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Campaign Register</div><div className="card-subtitle">{filtered.length} of {campaigns.length} campaigns</div></div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Campaign</th><th>Type</th><th style={{ textAlign:'right' }}>Budget</th><th>Start</th><th>End</th><th>Status</th><th style={{ width: 120 }}>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4, width: '70%' }} /></td>
                    ))}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon={Target} title="No campaigns found" message="Create your first marketing campaign." /></td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td><span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}><span className="badge-dot" />{c.type}</span></td>
                    <td style={{ textAlign:'right', fontWeight: 600 }}>{fmtMoney(c.budget)}</td>
                    <td className="td-muted">{fmtDate(c.startDate)}</td>
                    <td className="td-muted">{fmtDate(c.endDate)}</td>
                    <td><Badge status={c.status} /></td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-sm" title="View Metrics" onClick={() => setMetricsFor(c)}><BarChart3 size={13} /></button>
                        {canManage && <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(c)}><Pencil size={13} /></button>}
                        {canManage && <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setDelTarget(c)}><Trash2 size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Campaign" size="md"
          footer={<><button className="btn btn-secondary btn-sm" onClick={() => setAddOpen(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create Campaign'}</button></>}
        ><CampaignForm form={form} setForm={setForm} formError={formError} /></Modal>

        <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit — ${editTarget?.name}`} size="md"
          footer={<><button className="btn btn-secondary btn-sm" onClick={() => setEditTarget(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleUpdate} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button></>}
        ><CampaignForm form={form} setForm={setForm} formError={formError} /></Modal>

        <ConfirmModal open={!!deleteTarget} onClose={() => setDelTarget(null)} onConfirm={handleDelete}
          title="Delete Campaign" message={`Delete "${deleteTarget?.name}"? This will also remove all associated metrics.`} loading={saving} />

        {metricsFor && <MetricsPanel campaign={metricsFor} onClose={() => setMetricsFor(null)} />}
      </main>
    </div>
  );
}
