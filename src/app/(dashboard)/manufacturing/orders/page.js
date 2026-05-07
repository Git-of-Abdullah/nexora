'use client';

import { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { Plus, Search, RefreshCw, Pencil, Trash2, Factory, ChevronRight } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d) { if (!d) return '—'; const dt = new Date(d); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; }

const STATUSES = ['Draft','Scheduled','In Production','Quality Check','Completed','Cancelled'];
const EMPTY_FORM = { productId: '', quantity: '', workCentreId: '', startDate: '', endDate: '' };
const EDIT_STATUSES = STATUSES;

export default function ProductionOrdersPage() {
  const [orders,      setOrders]      = useState([]);
  const [products,    setProducts]    = useState([]);
  const [workCentres, setWorkCentres] = useState([]);
  const [loading,     setLoading]     = useState(true);

  const [search,       setSearch]     = useState('');
  const [filterStatus, setStatus]     = useState('');

  const [addOpen,      setAddOpen]    = useState(false);
  const [editTarget,   setEditTarget] = useState(null);
  const [deleteTarget, setDelTarget]  = useState(null);
  const [form,         setForm]       = useState(EMPTY_FORM);
  const [editStatus,   setEditStatus] = useState('');
  const [saving,       setSaving]     = useState(false);
  const [formError,    setFormError]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ord, prod, wc] = await Promise.all([
        api.get('/manufacturing/orders'),
        api.get('/manufacturing/products'),
        api.get('/manufacturing/work-centres'),
      ]);
      setOrders(ord);
      setProducts(prod);
      setWorkCentres(wc);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter(o => {
    const name = (o.product?.name || '').toLowerCase();
    const sku  = (o.product?.sku  || '').toLowerCase();
    const q    = search.toLowerCase();
    return (!q || name.includes(q) || sku.includes(q)) &&
           (!filterStatus || o.status === filterStatus);
  });

  /* ── Create order ── */
  async function handleCreate() {
    setFormError('');
    setSaving(true);
    try {
      const created = await api.post('/manufacturing/orders', {
        productId:    form.productId,
        quantity:     form.quantity,
        workCentreId: form.workCentreId || undefined,
        startDate:    form.startDate    || undefined,
        endDate:      form.endDate      || undefined,
      });
      setOrders(prev => [created, ...prev]);
      setAddOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err?.error || 'Failed to create order.');
    } finally { setSaving(false); }
  }

  /* ── Update status ── */
  async function handleStatusUpdate() {
    setSaving(true);
    try {
      const updated = await api.patch(`/manufacturing/orders/${editTarget.id}`, { status: editStatus });
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      setEditTarget(null);
    } catch (err) {
      setFormError(err?.error || 'Failed to update order.');
    } finally { setSaving(false); }
  }

  /* ── Delete ── */
  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/manufacturing/orders/${deleteTarget.id}`);
      setOrders(prev => prev.filter(o => o.id !== deleteTarget.id));
      setDelTarget(null);
    } catch (err) {
      alert(err?.error || 'Failed to delete order.');
    } finally { setSaving(false); }
  }

  /* ── Status pill colours for the dropdown ── */
  const statusCount = STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="page-wrapper">
      <Topbar title="Production Orders" subtitle="Create and track manufacturing work orders" />
      <main className="page-main">

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setStatus('')}
            className={`btn btn-sm ${!filterStatus ? 'btn-primary' : 'btn-secondary'}`}
          >
            All <span style={{ opacity: 0.7, marginLeft: 4 }}>({orders.length})</span>
          </button>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatus(filterStatus === s ? '' : s)}
              className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-secondary'}`}
            >
              {s} <span style={{ opacity: 0.7, marginLeft: 4 }}>({statusCount[s]})</span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="filters-row" style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search product, SKU…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-primary btn-sm" onClick={() => { setAddOpen(true); setForm(EMPTY_FORM); setFormError(''); }}>
            <Plus size={14} /> New Order
          </button>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Production Orders</div>
              <div className="card-subtitle">{filtered.length} of {orders.length} orders</div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Work Centre</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th style={{ width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4, width: '75%' }} /></td>
                    ))}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8}>
                    <EmptyState icon={Factory} title="No production orders" message="Create a new order to get started." />
                  </td></tr>
                ) : filtered.map(o => (
                  <tr key={o.id}>
                    <td className="td-mono">#{o.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.product?.name || '—'}</div>
                      <div className="td-muted">{o.product?.sku}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{o.quantity?.toLocaleString()}</td>
                    <td className="td-muted">{o.workCentre?.name || '—'}</td>
                    <td className="td-muted">{fmtDate(o.startDate)}</td>
                    <td className="td-muted">{fmtDate(o.endDate)}</td>
                    <td><Badge status={o.status} /></td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn btn-ghost btn-sm btn-icon" title="Update Status"
                          onClick={() => { setEditTarget(o); setEditStatus(o.status); setFormError(''); }}
                        ><Pencil size={13} /></button>
                        {['Draft','Cancelled'].includes(o.status) && (
                          <button
                            className="btn btn-ghost btn-sm btn-icon" title="Delete"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => setDelTarget(o)}
                          ><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Create Modal ── */}
        <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New Production Order" size="md"
          footer={<>
            <button className="btn btn-secondary btn-sm" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create Order'}</button>
          </>}
        >
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Product *</label>
            <select className="form-select" value={form.productId} onChange={e => setForm(p => ({ ...p, productId: e.target.value }))}>
              <option value="">Select product…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input type="number" className="form-input" placeholder="100" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Work Centre</label>
              <select className="form-select" value={form.workCentreId} onChange={e => setForm(p => ({ ...p, workCentreId: e.target.value }))}>
                <option value="">None</option>
                {workCentres.map(wc => <option key={wc.id} value={wc.id}>{wc.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Start Date</label><input type="date" className="form-input" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">End Date</label><input type="date" className="form-input" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} /></div>
          </div>
        </Modal>

        {/* ── Update Status Modal ── */}
        <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Update Order #${editTarget?.id}`} size="sm"
          footer={<>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditTarget(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleStatusUpdate} disabled={saving}>{saving ? 'Saving…' : 'Update Status'}</button>
          </>}
        >
          {formError && <div className="alert alert-error">{formError}</div>}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6 }}>Current: <Badge status={editTarget?.status} /></div>
          </div>
          <div className="form-group">
            <label className="form-label">New Status</label>
            <select className="form-select" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
              {EDIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            ⚠ Setting to <strong>Completed</strong> will auto-increment finished goods stock.
          </p>
        </Modal>

        {/* ── Delete Confirm ── */}
        <ConfirmModal
          open={!!deleteTarget}
          onClose={() => setDelTarget(null)}
          onConfirm={handleDelete}
          title="Delete Production Order"
          message={`Delete Order #${deleteTarget?.id} for "${deleteTarget?.product?.name}"? This cannot be undone.`}
          loading={saving}
        />
      </main>
    </div>
  );
}
