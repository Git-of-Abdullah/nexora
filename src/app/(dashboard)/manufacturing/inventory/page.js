'use client';

import { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';

/* ── Module-level form — prevents focus loss on re-render ── */
function MaterialForm({ form, setForm, formError }) {
  return (
    <>
      {formError && <div className="alert alert-error">{formError}</div>}
      <div className="form-row">
        <div className="form-group"><label className="form-label">Material Name *</label><input className="form-input" placeholder="Steel Rod" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Unit *</label><input className="form-input" placeholder="kg" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} /></div>
      </div>
      <div className="form-row-3">
        <div className="form-group"><label className="form-label">Stock Qty *</label><input type="number" className="form-input" placeholder="500" value={form.stockQty} onChange={e => setForm(p => ({ ...p, stockQty: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Reorder Level *</label><input type="number" className="form-input" placeholder="100" value={form.reorderLevel} onChange={e => setForm(p => ({ ...p, reorderLevel: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Cost / Unit *</label><input type="number" className="form-input" placeholder="2.50" step="0.01" value={form.costPerUnit} onChange={e => setForm(p => ({ ...p, costPerUnit: e.target.value }))} /></div>
      </div>
    </>
  );
}
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, RefreshCw, Pencil, Package, AlertTriangle } from 'lucide-react';

function fmtQty(n) { return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function fmtMoney(n) { return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function StockBar({ qty, reorder }) {
  const pct = reorder > 0 ? Math.min(100, (qty / (reorder * 2)) * 100) : 100;
  const color = qty === 0 ? 'var(--danger)' : qty <= reorder ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color, minWidth: 28, textAlign: 'right' }}>
        {fmtQty(qty)}
      </span>
    </div>
  );
}

function StockChip({ status }) {
  const map = {
    ok:  { label: 'In Stock',    cls: 'badge-success' },
    low: { label: 'Low Stock',   cls: 'badge-warning' },
    out: { label: 'Out of Stock', cls: 'badge-danger' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'badge-neutral' };
  return <span className={`badge ${cls}`}><span className="badge-dot" />{label}</span>;
}

const EMPTY_ADD  = { name: '', unit: 'kg', stockQty: '', reorderLevel: '', costPerUnit: '' };

export default function InventoryPage() {
  const { user } = useAuth();
  const canManage = ['super_admin','manufacturing_manager'].includes(user?.role);
  const [materials, setMaterials] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filterStock, setFStock]  = useState('');

  const [addOpen,    setAddOpen]    = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(EMPTY_ADD);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setMaterials(await api.get('/manufacturing/inventory')); }
    catch { setMaterials([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = materials.filter(m => {
    const matchQ = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const matchS = !filterStock || m.stockStatus === filterStock;
    return matchQ && matchS;
  });

  const totalValue = materials.reduce((s, m) => s + Number(m.stockQty) * Number(m.costPerUnit), 0);
  const lowCount   = materials.filter(m => m.stockStatus === 'low').length;
  const outCount   = materials.filter(m => m.stockStatus === 'out').length;

  /* ── Add material ── */
  async function handleAdd() {
    setFormError('');
    setSaving(true);
    try {
      const created = await api.post('/manufacturing/inventory', {
        name:         form.name,
        unit:         form.unit,
        stockQty:     form.stockQty,
        reorderLevel: form.reorderLevel,
        costPerUnit:  form.costPerUnit,
      });
      setMaterials(prev => [...prev, { ...created, stockStatus: Number(created.stockQty) === 0 ? 'out' : Number(created.stockQty) <= Number(created.reorderLevel) ? 'low' : 'ok' }]);
      setAddOpen(false);
      setForm(EMPTY_ADD);
    } catch (err) { setFormError(err?.error || 'Failed to add material.'); }
    finally { setSaving(false); }
  }

  /* ── Edit material ── */
  async function handleEdit() {
    setFormError('');
    setSaving(true);
    try {
      const updated = await api.patch(`/manufacturing/inventory/${editTarget.id}`, {
        name:         form.name         || undefined,
        unit:         form.unit         || undefined,
        stockQty:     form.stockQty     !== '' ? form.stockQty     : undefined,
        reorderLevel: form.reorderLevel !== '' ? form.reorderLevel : undefined,
        costPerUnit:  form.costPerUnit  !== '' ? form.costPerUnit  : undefined,
      });
      const tagged = {
        ...updated,
        stockStatus: Number(updated.stockQty) === 0 ? 'out' : Number(updated.stockQty) <= Number(updated.reorderLevel) ? 'low' : 'ok',
      };
      setMaterials(prev => prev.map(m => m.id === tagged.id ? tagged : m));
      setEditTarget(null);
    } catch (err) { setFormError(err?.error || 'Failed to update material.'); }
    finally { setSaving(false); }
  }

  function openEdit(m) {
    setEditTarget(m);
    setForm({ name: m.name, unit: m.unit, stockQty: String(m.stockQty), reorderLevel: String(m.reorderLevel), costPerUnit: String(m.costPerUnit) });
    setFormError('');
  }

  // MaterialForm is now a module-level component above

  return (
    <div className="page-wrapper">
      <Topbar title="Raw Material Inventory" subtitle="Stock levels, reorder alerts, cost tracking" />
      <main className="page-main">

        {/* Summary row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="badge badge-accent" style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
            Total Value: <strong style={{ marginLeft: 4 }}>{fmtMoney(totalValue)}</strong>
          </div>
          {lowCount > 0 && <div className="badge badge-warning" style={{ padding: '6px 14px', fontSize: '0.8125rem' }}><AlertTriangle size={12} style={{ marginRight: 4 }} />Low Stock: <strong style={{ marginLeft: 4 }}>{lowCount}</strong></div>}
          {outCount > 0 && <div className="badge badge-danger"  style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>Out of Stock: <strong style={{ marginLeft: 4 }}>{outCount}</strong></div>}
        </div>

        {/* Toolbar */}
        <div className="filters-row" style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search material…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={filterStock} onChange={e => setFStock(e.target.value)}>
            <option value="">All Stock</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
          {canManage && <button className="btn btn-primary btn-sm" onClick={() => { setAddOpen(true); setForm(EMPTY_ADD); setFormError(''); }}>
            <Plus size={14} /> Add Material
          </button>}
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Raw Materials</div>
              <div className="card-subtitle">{filtered.length} of {materials.length} materials</div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Unit</th>
                  <th style={{ minWidth: 160 }}>Stock Level</th>
                  <th>Reorder At</th>
                  <th>Cost / Unit</th>
                  <th>Stock Value</th>
                  <th>Status</th>
                  <th style={{ width: 60 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4, width: '70%' }} /></td>
                    ))}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8}>
                    <EmptyState icon={Package} title="No materials found" message="Add raw materials to begin tracking inventory." />
                  </td></tr>
                ) : filtered.map(m => (
                  <tr key={m.id} style={{ background: m.stockStatus === 'out' ? 'rgba(220,38,38,0.03)' : m.stockStatus === 'low' ? 'rgba(217,119,6,0.03)' : undefined }}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td className="td-muted">{m.unit}</td>
                    <td style={{ minWidth: 160 }}><StockBar qty={Number(m.stockQty)} reorder={Number(m.reorderLevel)} /></td>
                    <td className="td-mono">{fmtQty(m.reorderLevel)}</td>
                    <td className="td-mono">{fmtMoney(m.costPerUnit)}</td>
                    <td style={{ fontWeight: 600 }}>{fmtMoney(Number(m.stockQty) * Number(m.costPerUnit))}</td>
                    <td><StockChip status={m.stockStatus} /></td>
                    <td>
                      {canManage && <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => openEdit(m)}><Pencil size={13} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Modal */}
        <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Raw Material" size="md"
          footer={<>
            <button className="btn btn-secondary btn-sm" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Add Material'}</button>
          </>}
        >
          <MaterialForm form={form} setForm={setForm} formError={formError} />
        </Modal>

        {/* Edit Modal */}
        <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit — ${editTarget?.name}`} size="md"
          footer={<>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditTarget(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </>}
        >
          <MaterialForm form={form} setForm={setForm} formError={formError} />
        </Modal>
      </main>
    </div>
  );
}
