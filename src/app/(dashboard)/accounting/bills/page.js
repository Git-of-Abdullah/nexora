'use client';

import { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { Plus, Search, RefreshCw, Pencil, Trash2, Receipt, CheckCircle2, Printer, AlertCircle } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d)  { if (!d) return '—'; const dt = new Date(d); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; }
function fmtMoney(n) { return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const BILL_STATUSES = ['Unpaid','Partial','Paid','Overdue'];

/* ── Module-level form — fixes focus loss ── */
function BillForm({ form, setForm, formError }) {
  return (
    <>
      {formError && <div className="alert alert-error" style={{display:'flex',alignItems:'center',gap:8}}><AlertCircle size={15}/> {formError}</div>}
      <div className="form-group">
        <label className="form-label">Supplier Name *</label>
        <input className="form-input" placeholder="Global Supplies Ltd" value={form.supplierName}
          onChange={e => setForm(p => ({ ...p, supplierName: e.target.value }))} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Amount ($) *</label>
          <input type="number" step="0.01" className="form-input" placeholder="500.00" value={form.amount}
            onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Due Date *</label>
          <input type="date" className="form-input" value={form.dueDate}
            onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-select" value={form.status}
          onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
          {BILL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </>
  );
}

function printBill(bill) {
  const win = window.open('', '_blank', 'width=800,height=700');
  win.document.write(`<!DOCTYPE html><html><head><title>Bill #${bill.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #0f172a; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo { font-size: 22px; font-weight: 800; color: #1B2A4A; letter-spacing: -0.02em; }
    .logo span { color: #2E75B6; }
    .bill-meta { text-align: right; }
    .bill-meta h2 { font-size: 26px; font-weight: 800; color: #1B2A4A; margin-bottom: 4px; }
    .bill-meta p { font-size: 12px; color: #64748b; }
    .divider { height: 2px; background: #1B2A4A; margin: 24px 0; }
    .info-row { display: flex; gap: 40px; margin-bottom: 32px; }
    .info-block label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; display: block; margin-bottom: 4px; }
    .info-block p { font-size: 14px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
    td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; }
    .total-row { font-size: 18px; font-weight: 800; }
    .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #94a3b8; }
    @media print { body { padding: 24px; } }
  </style></head><body>
  <div class="header">
    <div class="logo">Nexora<span> ERP</span></div>
    <div class="bill-meta">
      <h2>BILL / PAYABLE</h2>
      <p>#BILL-${String(bill.id).padStart(4,'0')}</p>
    </div>
  </div>
  <div class="divider"></div>
  <div class="info-row">
    <div class="info-block"><label>Supplier</label><p>${bill.supplierName}</p></div>
    <div class="info-block"><label>Due Date</label><p>${fmtDate(bill.dueDate)}</p></div>
    <div class="info-block"><label>Status</label><p>${bill.effectiveStatus || bill.status}</p></div>
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      <tr><td>Supplier Invoice</td><td style="text-align:right">${fmtMoney(bill.amount)}</td></tr>
      <tr class="total-row"><td>Total Due</td><td style="text-align:right">${fmtMoney(bill.amount)}</td></tr>
    </tbody>
  </table>
  <div class="footer"><p>Nexora ERP — Accounts Payable</p></div>
  </body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 300);
}

const EMPTY_FORM = { supplierName: '', amount: '', dueDate: '', status: 'Unpaid' };

export default function BillsPage() {
  const [bills,        setBills]     = useState([]);
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
    try { setBills(await api.get('/accounting/bills')); }
    catch { setBills([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = bills.filter(b => {
    const eff = b.effectiveStatus || b.status;
    return (!search || b.supplierName?.toLowerCase().includes(search.toLowerCase())) &&
           (!filterStatus || eff === filterStatus || b.status === filterStatus);
  });

  const unpaid  = bills.filter(b => b.status !== 'Paid').reduce((s, b) => s + Number(b.amount||0), 0);
  const overdue = bills.filter(b => b.effectiveStatus === 'Overdue' || b.isOverdue).length;

  async function handleCreate() {
    setFormError(''); setSaving(true);
    try {
      const created = await api.post('/accounting/bills', { supplierName: form.supplierName, amount: parseFloat(form.amount), dueDate: form.dueDate, status: form.status });
      setBills(prev => [created, ...prev]);
      setAddOpen(false); setForm(EMPTY_FORM);
    } catch (err) { setFormError(err?.error || 'Failed.'); }
    finally { setSaving(false); }
  }

  async function handleUpdate() {
    setFormError(''); setSaving(true);
    try {
      const updated = await api.patch(`/accounting/bills/${editTarget.id}`, { supplierName: form.supplierName||undefined, amount: form.amount?parseFloat(form.amount):undefined, dueDate: form.dueDate||undefined, status: form.status||undefined });
      setBills(prev => prev.map(b => b.id === updated.id ? updated : b));
      setEditTarget(null);
    } catch (err) { setFormError(err?.error || 'Failed.'); }
    finally { setSaving(false); }
  }

  async function markPaid(bill) {
    try { const u = await api.patch(`/accounting/bills/${bill.id}`, { status: 'Paid' }); setBills(prev => prev.map(b => b.id === u.id ? u : b)); }
    catch (err) { alert(err?.error || 'Failed.'); }
  }

  async function handleDelete() {
    setSaving(true);
    try { await api.delete(`/accounting/bills/${deleteTarget.id}`); setBills(prev => prev.filter(b => b.id !== deleteTarget.id)); setDelTarget(null); }
    catch (err) { alert(err?.error || 'Failed.'); }
    finally { setSaving(false); }
  }

  function openEdit(bill) {
    setEditTarget(bill);
    setForm({ supplierName: bill.supplierName||'', amount: String(bill.amount||''), dueDate: bill.dueDate?.split('T')[0]||'', status: bill.status||'Unpaid' });
    setFormError('');
  }

  return (
    <div className="page-wrapper">
      <Topbar title="Bills" subtitle="Accounts payable — supplier bills & payment tracking" />
      <main className="page-main">
        <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
          {[{label:'Outstanding',value:fmtMoney(unpaid),cls:'badge-warning'},{label:'Overdue',value:overdue,cls:'badge-danger'},{label:'Total Bills',value:bills.length,cls:'badge-neutral'}].map(({label,value,cls})=>(
            <div key={label} className={`badge ${cls}`} style={{padding:'6px 14px',fontSize:'0.8125rem'}}>{label}: <strong style={{marginLeft:4}}>{value}</strong></div>
          ))}
        </div>
        <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
          <button onClick={()=>setStatus('')} className={`btn btn-sm ${!filterStatus?'btn-primary':'btn-secondary'}`}>All ({bills.length})</button>
          {BILL_STATUSES.map(s => { const cnt=bills.filter(b=>(b.effectiveStatus||b.status)===s||b.status===s).length; return <button key={s} onClick={()=>setStatus(filterStatus===s?'':s)} className={`btn btn-sm ${filterStatus===s?'btn-primary':'btn-secondary'}`}>{s} ({cnt})</button>; })}
        </div>
        <div className="filters-row" style={{marginBottom:16}}>
          <div style={{position:'relative',flex:'1 1 200px',maxWidth:300}}>
            <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}}/>
            <input className="form-input" placeholder="Search supplier…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:32}}/>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/></button>
          <button className="btn btn-primary btn-sm" onClick={()=>{setAddOpen(true);setForm(EMPTY_FORM);setFormError('');}}>
            <Plus size={14}/> Add Bill
          </button>
        </div>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Supplier Bills</div><div className="card-subtitle">{filtered.length} of {bills.length} bills</div></div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>#</th><th>Supplier</th><th style={{textAlign:'right'}}>Amount</th><th>Due Date</th><th>Status</th><th style={{width:140}}>Actions</th></tr></thead>
              <tbody>
                {loading ? Array.from({length:5}).map((_,i)=>(<tr key={i}>{Array.from({length:6}).map((_,j)=>(<td key={j}><div className="skeleton" style={{height:14,borderRadius:4,width:'70%'}}/></td>))}</tr>))
                : filtered.length===0 ? <tr><td colSpan={6}><EmptyState icon={Receipt} title="No bills found" message="Add supplier bills to track payables."/></td></tr>
                : filtered.map(b => {
                  const eff = b.effectiveStatus||b.status;
                  return (
                    <tr key={b.id} style={{background:eff==='Overdue'?'rgba(220,38,38,0.02)':undefined}}>
                      <td className="td-mono">#{String(b.id).padStart(4,'0')}</td>
                      <td style={{fontWeight:600}}>{b.supplierName}</td>
                      <td style={{textAlign:'right',fontWeight:700}}>{fmtMoney(b.amount)}</td>
                      <td className="td-muted">{fmtDate(b.dueDate)}</td>
                      <td><Badge status={eff}/></td>
                      <td>
                        <div className="table-actions">
                          {b.status!=='Paid' && <button className="btn btn-success btn-sm" onClick={()=>markPaid(b)}><CheckCircle2 size={12}/> Paid</button>}
                          <button className="btn btn-ghost btn-sm btn-icon" title="Print" onClick={()=>printBill(b)}><Printer size={13}/></button>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openEdit(b)}><Pencil size={13}/></button>
                          <button className="btn btn-ghost btn-sm btn-icon" style={{color:'var(--danger)'}} onClick={()=>setDelTarget(b)}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Add Supplier Bill" size="md"
          footer={<><button className="btn btn-secondary btn-sm" onClick={()=>setAddOpen(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>{saving?'Saving…':'Add Bill'}</button></>}>
          <BillForm form={form} setForm={setForm} formError={formError}/>
        </Modal>

        <Modal open={!!editTarget} onClose={()=>setEditTarget(null)} title={`Edit Bill #${editTarget?.id}`} size="md"
          footer={<><button className="btn btn-secondary btn-sm" onClick={()=>setEditTarget(null)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleUpdate} disabled={saving}>{saving?'Saving…':'Save Changes'}</button></>}>
          <BillForm form={form} setForm={setForm} formError={formError}/>
        </Modal>

        <ConfirmModal open={!!deleteTarget} onClose={()=>setDelTarget(null)} onConfirm={handleDelete}
          title="Delete Bill" message={`Delete bill #${deleteTarget?.id} from "${deleteTarget?.supplierName}"?`} loading={saving}/>
      </main>
    </div>
  );
}
