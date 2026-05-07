'use client';

import { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { Plus, Search, RefreshCw, CheckCircle2, XCircle, ClipboardCheck } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d) { if (!d) return '—'; const dt = new Date(d); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; }

function ResultChip({ result }) {
  const isPass = result === 'Pass';
  return (
    <span className={`badge ${isPass ? 'badge-success' : 'badge-danger'}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {isPass
        ? <CheckCircle2 size={11} />
        : <XCircle     size={11} />}
      {result}
    </span>
  );
}

const EMPTY_FORM = { orderId: '', result: 'Pass', notes: '' };

export default function QualityPage() {
  const [checks,  setChecks]  = useState([]);
  const [orders,  setOrders]  = useState([]);   // QC-eligible orders
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filterResult, setFResult] = useState('');

  const [addOpen,   setAddOpen]   = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qc, ord] = await Promise.all([
        api.get('/manufacturing/quality-checks'),
        api.get('/manufacturing/orders'),
      ]);
      setChecks(qc);
      // Only show orders that are in QC stage or In Production
      setOrders(ord.filter(o => ['In Production', 'Quality Check'].includes(o.status)));
    } catch { setChecks([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = checks.filter(c => {
    const prod = (c.order?.product?.name || '').toLowerCase();
    const insp = (c.inspector?.name     || '').toLowerCase();
    const q    = search.toLowerCase();
    const matchQ = !q || prod.includes(q) || insp.includes(q);
    const matchR = !filterResult || c.result === filterResult;
    return matchQ && matchR;
  });

  const passed   = checks.filter(c => c.result === 'Pass').length;
  const failed   = checks.filter(c => c.result === 'Fail').length;
  const passRate = checks.length > 0 ? Math.round((passed / checks.length) * 100) : null;

  /* ── Log quality check ── */
  async function handleLog() {
    setFormError('');
    setSaving(true);
    try {
      const created = await api.post('/manufacturing/quality-checks', {
        orderId: form.orderId,
        result:  form.result,
        notes:   form.notes,
      });
      setChecks(prev => [created, ...prev]);
      setAddOpen(false);
      setForm(EMPTY_FORM);
      // Refresh orders list — a Pass auto-completes the order
      if (form.result === 'Pass') {
        const updated = await api.get('/manufacturing/orders');
        setOrders(updated.filter(o => ['In Production', 'Quality Check'].includes(o.status)));
      }
    } catch (err) { setFormError(err?.error || 'Failed to log quality check.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="page-wrapper">
      <Topbar title="Quality Checks" subtitle="Inspection results per production order" />
      <main className="page-main">

        {/* Summary */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="badge badge-success" style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
            Passed: <strong style={{ marginLeft: 4 }}>{passed}</strong>
          </div>
          <div className="badge badge-danger" style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
            Failed: <strong style={{ marginLeft: 4 }}>{failed}</strong>
          </div>
          {passRate !== null && (
            <div className="badge badge-accent" style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
              Pass Rate: <strong style={{ marginLeft: 4 }}>{passRate}%</strong>
            </div>
          )}
          {/* Visual pass-rate bar */}
          {checks.length > 0 && (
            <div style={{ flex: 1, maxWidth: 200, height: 8, background: 'var(--danger-bg)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${passRate}%`, background: 'var(--success)', borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="filters-row" style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search product, inspector…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={filterResult} onChange={e => setFResult(e.target.value)}>
            <option value="">All Results</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-primary btn-sm" onClick={() => { setAddOpen(true); setForm(EMPTY_FORM); setFormError(''); }}>
            <Plus size={14} /> Log Check
          </button>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Quality Inspection Log</div>
              <div className="card-subtitle">{filtered.length} of {checks.length} records</div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Product</th>
                  <th>Inspector</th>
                  <th>Result</th>
                  <th>Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4, width: '70%' }} /></td>
                    ))}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6}>
                    <EmptyState icon={ClipboardCheck} title="No quality checks logged" message="Log an inspection result against a production order." />
                  </td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} style={{ background: c.result === 'Fail' ? 'rgba(220,38,38,0.02)' : undefined }}>
                    <td className="td-mono">#{c.order?.id || c.orderId}</td>
                    <td style={{ fontWeight: 600 }}>{c.order?.product?.name || '—'}</td>
                    <td className="td-muted">{c.inspector?.name || '—'}</td>
                    <td><ResultChip result={c.result} /></td>
                    <td className="td-muted">{fmtDate(c.date)}</td>
                    <td className="td-muted" style={{ maxWidth: 200 }}>
                      <span className="truncate" style={{ display: 'block' }}>{c.notes || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log Check Modal */}
        <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Log Quality Check" size="md"
          footer={<>
            <button className="btn btn-secondary btn-sm" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleLog} disabled={saving}>{saving ? 'Saving…' : 'Log Inspection'}</button>
          </>}
        >
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Production Order *</label>
            <select className="form-select" value={form.orderId} onChange={e => setForm(p => ({ ...p, orderId: e.target.value }))}>
              <option value="">Select order…</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  #{o.id} — {o.product?.name} (qty: {o.quantity})
                </option>
              ))}
            </select>
            {orders.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>No orders in "In Production" or "Quality Check" status.</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Result *</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Pass', 'Fail'].map(r => (
                <label key={r} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px', borderRadius: 8, cursor: 'pointer',
                  border: `2px solid ${form.result === r ? (r === 'Pass' ? 'var(--success)' : 'var(--danger)') : 'var(--border)'}`,
                  background: form.result === r ? (r === 'Pass' ? 'var(--success-bg)' : 'var(--danger-bg)') : 'none',
                  transition: 'all 0.15s',
                }}>
                  <input type="radio" name="result" value={r} checked={form.result === r} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} style={{ display: 'none' }} />
                  {r === 'Pass' ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} /> : <XCircle size={16} style={{ color: 'var(--danger)' }} />}
                  <span style={{ fontWeight: 600, color: r === 'Pass' ? 'var(--success)' : 'var(--danger)', fontSize: '0.875rem' }}>{r}</span>
                </label>
              ))}
            </div>
            {form.result === 'Pass' && <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 6, display:'flex', alignItems:'center', gap:5 }}><CheckCircle2 size={12}/> A "Pass" will automatically advance the order to "Completed".</p>}
            {form.result === 'Fail' && <p style={{ fontSize: '0.75rem', color: 'var(--danger)',  marginTop: 6, display:'flex', alignItems:'center', gap:5 }}><XCircle size={12}/> A "Fail" will keep the order in Quality Check status.</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" placeholder="Inspection observations, defect description…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </Modal>
      </main>
    </div>
  );
}
