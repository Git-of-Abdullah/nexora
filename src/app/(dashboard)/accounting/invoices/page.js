'use client';

import { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { Plus, Search, RefreshCw, Pencil, Trash2, FileText, CheckCircle2, Printer, AlertCircle } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d)  { if (!d) return '—'; const dt = new Date(d); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; }
function fmtMoney(n) { return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const INV_STATUSES = ['Pending','Sent','Partial','Paid','Overdue'];

/* ── Module-level form (avoids focus loss on re-render) ── */
function InvoiceForm({ form, setForm, formError }) {
  return (
    <>
      {formError && (
        <div className="alert alert-error" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <AlertCircle size={15} /> {formError}
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Client Name *</label>
        <input className="form-input" placeholder="Acme Corp" value={form.clientName}
          onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Amount ($) *</label>
          <input type="number" step="0.01" className="form-input" placeholder="1000.00" value={form.amount}
            onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Tax ($)</label>
          <input type="number" step="0.01" className="form-input" placeholder="0.00" value={form.tax}
            onChange={e => setForm(p => ({ ...p, tax: e.target.value }))} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Due Date *</label>
          <input type="date" className="form-input" value={form.dueDate}
            onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status}
            onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
            {INV_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {form.amount && (
        <div className="alert alert-info" style={{ fontSize: '0.8rem' }}>
          Total incl. tax: <strong>{fmtMoney(Number(form.amount || 0) + Number(form.tax || 0))}</strong>
        </div>
      )}
    </>
  );
}

/* ── Print helper ── */
function printInvoice(inv) {
  const total = fmtMoney(Number(inv.amount || 0) + Number(inv.tax || 0));
  const win = window.open('', '_blank', 'width=800,height=700');
  win.document.write(`<!DOCTYPE html><html><head><title>Invoice #${inv.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #0f172a; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo { font-size: 22px; font-weight: 800; color: #1B2A4A; letter-spacing: -0.02em; }
    .logo span { color: #2E75B6; }
    .inv-meta { text-align: right; }
    .inv-meta h2 { font-size: 26px; font-weight: 800; color: #1B2A4A; margin-bottom: 4px; }
    .inv-meta p { font-size: 12px; color: #64748b; }
    .divider { height: 2px; background: #1B2A4A; margin: 24px 0; }
    .info-row { display: flex; gap: 40px; margin-bottom: 32px; }
    .info-block label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; display: block; margin-bottom: 4px; }
    .info-block p { font-size: 14px; font-weight: 600; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
    td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; }
    .totals { margin-left: auto; width: 280px; }
    .totals tr td:first-child { color: #64748b; }
    .totals tr td:last-child { text-align: right; font-weight: 600; }
    .totals .total-row td { font-size: 16px; font-weight: 800; color: #1B2A4A; padding-top: 12px; border-top: 2px solid #1B2A4A; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; background: ${inv.status === 'Paid' ? '#dcfce7' : '#fef3c7'}; color: ${inv.status === 'Paid' ? '#166534' : '#92400e'}; }
    .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #94a3b8; }
    @media print { body { padding: 24px; } }
  </style></head><body>
  <div class="header">
    <div class="logo">Nexora<span> ERP</span></div>
    <div class="inv-meta">
      <h2>INVOICE</h2>
      <p>#INV-${String(inv.id).padStart(4,'0')}</p>
      <p style="margin-top:6px"><span class="status-badge">${inv.status}</span></p>
    </div>
  </div>
  <div class="divider"></div>
  <div class="info-row">
    <div class="info-block"><label>Bill To</label><p>${inv.clientName}</p></div>
    <div class="info-block"><label>Issue Date</label><p>${fmtDate(inv.createdAt || new Date())}</p></div>
    <div class="info-block"><label>Due Date</label><p>${fmtDate(inv.dueDate)}</p></div>
    ${inv.paidDate ? `<div class="info-block"><label>Paid Date</label><p>${fmtDate(inv.paidDate)}</p></div>` : ''}
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      <tr><td>Services / Products</td><td style="text-align:right">${fmtMoney(inv.amount)}</td></tr>
    </tbody>
  </table>
  <table class="totals">
    <tr><td>Subtotal</td><td>${fmtMoney(inv.amount)}</td></tr>
    <tr><td>Tax</td><td>${fmtMoney(inv.tax)}</td></tr>
    <tr class="total-row"><td>Total</td><td>${total}</td></tr>
  </table>
  <div class="footer"><p>Thank you for your business — Nexora ERP</p></div>
  </body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 300);
}

const EMPTY_FORM = { clientName: '', amount: '', tax: '', dueDate: '', status: 'Pending' };

export default function InvoicesPage() {
  const [invoices,     setInvoices]  = useState([]);
  const [loading,      setLoading]   = useState(true);
  const [search,       setSearch]    = useState('');
  const [filterStatus, setStatus]    = useState('');
  const [addOpen,      setAddOpen]   = useState(false);
  const [editTarget,   setEditTarget]= useState(null);
  const [deleteTarget, setDelTarget] = useState(null);
  const [form,         setForm]      = useState(EMPTY_FORM);
  const [saving,       setSaving]    = useState(false);
  const [formError,    setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setInvoices(await api.get('/accounting/invoices')); }
    catch { setInvoices([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = invoices.filter(inv => {
    const q   = search.toLowerCase();
    const eff = inv.effectiveStatus || inv.status;
    return (!q || inv.clientName?.toLowerCase().includes(q)) &&
           (!filterStatus || eff === filterStatus || inv.status === filterStatus);
  });

  const totals = {
    pending: invoices.filter(i => ['Pending','Sent','Partial'].includes(i.status)).length,
    paid:    invoices.filter(i => i.status === 'Paid').length,
    overdue: invoices.filter(i => (i.effectiveStatus || i.status) === 'Overdue').length,
    revenue: invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.amount||0) + Number(i.tax||0), 0),
  };

  async function handleCreate() {
    setFormError(''); setSaving(true);
    try {
      const created = await api.post('/accounting/invoices', { clientName: form.clientName, amount: parseFloat(form.amount), tax: form.tax ? parseFloat(form.tax) : 0, dueDate: form.dueDate, status: form.status });
      setInvoices(prev => [created, ...prev]);
      setAddOpen(false); setForm(EMPTY_FORM);
    } catch (err) { setFormError(err?.error || 'Failed to create invoice.'); }
    finally { setSaving(false); }
  }

  async function handleUpdate() {
    setFormError(''); setSaving(true);
    try {
      const updated = await api.patch(`/accounting/invoices/${editTarget.id}`, { clientName: form.clientName||undefined, amount: form.amount ? parseFloat(form.amount):undefined, tax: form.tax!=='' ? parseFloat(form.tax):undefined, dueDate: form.dueDate||undefined, status: form.status||undefined });
      setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i));
      setEditTarget(null);
    } catch (err) { setFormError(err?.error || 'Failed to update invoice.'); }
    finally { setSaving(false); }
  }

  async function markPaid(inv) {
    try { const u = await api.patch(`/accounting/invoices/${inv.id}`, { status: 'Paid' }); setInvoices(prev => prev.map(i => i.id === u.id ? u : i)); }
    catch (err) { alert(err?.error || 'Failed.'); }
  }

  async function handleDelete() {
    setSaving(true);
    try { await api.delete(`/accounting/invoices/${deleteTarget.id}`); setInvoices(prev => prev.filter(i => i.id !== deleteTarget.id)); setDelTarget(null); }
    catch (err) { alert(err?.error || 'Failed.'); }
    finally { setSaving(false); }
  }

  function openEdit(inv) {
    setEditTarget(inv);
    setForm({ clientName: inv.clientName||'', amount: String(inv.amount||''), tax: String(inv.tax||''), dueDate: inv.dueDate?.split('T')[0]||'', status: inv.status||'Pending' });
    setFormError('');
  }

  return (
    <div className="page-wrapper">
      <Topbar title="Invoices" subtitle="Accounts receivable — create, track, collect" />
      <main className="page-main">
        <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
          {[{label:'Open',value:totals.pending,cls:'badge-accent'},{label:'Paid',value:totals.paid,cls:'badge-success'},{label:'Overdue',value:totals.overdue,cls:'badge-danger'},{label:'Revenue',value:fmtMoney(totals.revenue),cls:'badge-neutral'}].map(({label,value,cls})=>(
            <div key={label} className={`badge ${cls}`} style={{padding:'6px 14px',fontSize:'0.8125rem'}}>{label}: <strong style={{marginLeft:4}}>{value}</strong></div>
          ))}
        </div>
        <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
          <button onClick={()=>setStatus('')} className={`btn btn-sm ${!filterStatus?'btn-primary':'btn-secondary'}`}>All ({invoices.length})</button>
          {INV_STATUSES.map(s => { const cnt=invoices.filter(i=>(i.effectiveStatus||i.status)===s||i.status===s).length; return <button key={s} onClick={()=>setStatus(filterStatus===s?'':s)} className={`btn btn-sm ${filterStatus===s?'btn-primary':'btn-secondary'}`}>{s} ({cnt})</button>; })}
        </div>
        <div className="filters-row" style={{marginBottom:16}}>
          <div style={{position:'relative',flex:'1 1 200px',maxWidth:300}}>
            <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}}/>
            <input className="form-input" placeholder="Search client…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:32}}/>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/></button>
          <button className="btn btn-primary btn-sm" onClick={()=>{setAddOpen(true);setForm(EMPTY_FORM);setFormError('');}}>
            <Plus size={14}/> New Invoice
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Invoice Register</div><div className="card-subtitle">{filtered.length} of {invoices.length} invoices</div></div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>#</th><th>Client</th><th style={{textAlign:'right'}}>Amount</th><th style={{textAlign:'right'}}>Tax</th><th style={{textAlign:'right'}}>Total</th><th>Due Date</th><th>Paid Date</th><th>Status</th><th style={{width:130}}>Actions</th></tr></thead>
              <tbody>
                {loading ? Array.from({length:5}).map((_,i)=>(<tr key={i}>{Array.from({length:9}).map((_,j)=>(<td key={j}><div className="skeleton" style={{height:14,borderRadius:4,width:'70%'}}/></td>))}</tr>))
                : filtered.length===0 ? <tr><td colSpan={9}><EmptyState icon={FileText} title="No invoices found" message="Create your first invoice."/></td></tr>
                : filtered.map(inv => {
                  const eff = inv.effectiveStatus||inv.status;
                  return (
                    <tr key={inv.id} style={{background: eff==='Overdue'?'rgba(220,38,38,0.02)':undefined}}>
                      <td className="td-mono">#{String(inv.id).padStart(4,'0')}</td>
                      <td style={{fontWeight:600}}>{inv.clientName}</td>
                      <td style={{textAlign:'right'}} className="td-mono">{fmtMoney(inv.amount)}</td>
                      <td style={{textAlign:'right'}} className="td-mono">{fmtMoney(inv.tax)}</td>
                      <td style={{textAlign:'right',fontWeight:700}}>{fmtMoney(Number(inv.amount||0)+Number(inv.tax||0))}</td>
                      <td className="td-muted">{fmtDate(inv.dueDate)}</td>
                      <td className="td-muted">{fmtDate(inv.paidDate)}</td>
                      <td><Badge status={eff}/></td>
                      <td>
                        <div className="table-actions">
                          {inv.status!=='Paid' && <button className="btn btn-success btn-sm" onClick={()=>markPaid(inv)}><CheckCircle2 size={12}/> Paid</button>}
                          <button className="btn btn-ghost btn-sm btn-icon" title="Print" onClick={()=>printInvoice(inv)}><Printer size={13}/></button>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openEdit(inv)}><Pencil size={13}/></button>
                          <button className="btn btn-ghost btn-sm btn-icon" style={{color:'var(--danger)'}} onClick={()=>setDelTarget(inv)}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Create Invoice" size="md"
          footer={<><button className="btn btn-secondary btn-sm" onClick={()=>setAddOpen(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>{saving?'Creating…':'Create Invoice'}</button></>}>
          <InvoiceForm form={form} setForm={setForm} formError={formError}/>
        </Modal>

        <Modal open={!!editTarget} onClose={()=>setEditTarget(null)} title={`Edit Invoice #${editTarget?.id}`} size="md"
          footer={<><button className="btn btn-secondary btn-sm" onClick={()=>setEditTarget(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleUpdate} disabled={saving}>{saving?'Saving…':'Save Changes'}</button></>}>
          <InvoiceForm form={form} setForm={setForm} formError={formError}/>
        </Modal>

        <ConfirmModal open={!!deleteTarget} onClose={()=>setDelTarget(null)} onConfirm={handleDelete}
          title="Delete Invoice" message={`Delete Invoice #${deleteTarget?.id} for "${deleteTarget?.clientName}"?`} loading={saving}/>
      </main>
    </div>
  );
}
