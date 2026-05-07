'use client';

import { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { Plus, Search, RefreshCw, CheckCircle2, XCircle, Briefcase } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d) { if (!d) return '—'; const dt = new Date(d); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; }
function daysBetween(a, b) {
  if (!a || !b) return '—';
  const diff = Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
  return `${diff} day${diff !== 1 ? 's' : ''}`;
}

const LEAVE_TYPES = ['Annual', 'Sick', 'Casual', 'Maternity', 'Paternity', 'Unpaid'];
const EMPTY_FORM  = { employeeId: '', type: 'Annual', fromDate: '', toDate: '', notes: '' };

export default function LeavePage() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterStatus, setStatus] = useState('');
  const [filterType, setType]   = useState('');

  const [addOpen, setAddOpen]   = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lv, emp] = await Promise.all([
        api.get('/hr/leave-requests'),
        api.get('/hr/employees'),
      ]);
      setRequests(lv);
      setEmployees(emp);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = requests.filter(r => {
    const name  = (r.employee?.user?.name || '').toLowerCase();
    const matchQ    = !search || name.includes(search.toLowerCase());
    const matchStat = !filterStatus || r.status === filterStatus;
    const matchType = !filterType   || r.type   === filterType;
    return matchQ && matchStat && matchType;
  });

  const pending  = requests.filter(r => r.status === 'Pending').length;
  const approved = requests.filter(r => r.status === 'Approved').length;
  const rejected = requests.filter(r => r.status === 'Rejected').length;

  /* ── Submit leave request ── */
  async function handleSubmit() {
    setFormError('');
    setSaving(true);
    try {
      const created = await api.post('/hr/leave-requests', {
        employeeId: form.employeeId,
        type:       form.type,
        fromDate:   form.fromDate,
        toDate:     form.toDate,
        notes:      form.notes,
      });
      setRequests(prev => [created, ...prev]);
      setAddOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err?.error || 'Failed to submit leave request.');
    } finally {
      setSaving(false);
    }
  }

  /* ── Approve / Reject ── */
  async function handleAction(id, status) {
    setActionId(id);
    try {
      const updated = await api.patch(`/hr/leave-requests/${id}`, { status });
      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch (err) {
      alert(err?.error || 'Action failed.');
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="page-wrapper">
      <Topbar title="Leave Requests" subtitle="Employee leave management & approvals" />
      <main className="page-main">

        {/* Summary badges */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Pending',  value: pending,  cls: 'badge-warning' },
            { label: 'Approved', value: approved, cls: 'badge-success' },
            { label: 'Rejected', value: rejected, cls: 'badge-danger' },
          ].map(({ label, value, cls }) => (
            <div key={label} className={`badge ${cls}`} style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
              {label}: <strong style={{ marginLeft: 4 }}>{value}</strong>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="filters-row" style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option>Pending</option><option>Approved</option><option>Rejected</option>
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={filterType} onChange={e => setType(e.target.value)}>
            <option value="">All Types</option>
            {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-primary btn-sm" onClick={() => { setAddOpen(true); setForm(EMPTY_FORM); setFormError(''); }}>
            <Plus size={14} /> New Request
          </button>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Leave Requests</div>
              <div className="card-subtitle">{filtered.length} of {requests.length} requests</div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4, width: '70%' }} /></td>
                    ))}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7}>
                    <EmptyState icon={Briefcase} title="No leave requests" message="Submit a new request using the button above." />
                  </td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.employee?.user?.name || '—'}</td>
                    <td>
                      <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                        <span className="badge-dot" />{r.type}
                      </span>
                    </td>
                    <td className="td-muted">{fmtDate(r.fromDate)}</td>
                    <td className="td-muted">{fmtDate(r.toDate)}</td>
                    <td style={{ fontWeight: 500 }}>{daysBetween(r.fromDate, r.toDate)}</td>
                    <td><Badge status={r.status} /></td>
                    <td>
                      {r.status === 'Pending' ? (
                        <div className="table-actions">
                          <button
                            className="btn btn-success btn-sm"
                            disabled={actionId === r.id}
                            onClick={() => handleAction(r.id, 'Approved')}
                            title="Approve"
                          >
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={actionId === r.id}
                            onClick={() => handleAction(r.id, 'Rejected')}
                            title="Reject"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="td-muted" style={{ fontSize: '0.75rem' }}>
                          {r.status === 'Approved' ? '✓ Approved' : '✗ Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Modal */}
        <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Submit Leave Request" size="md"
          footer={
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</button>
            </>
          }
        >
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Employee *</label>
            <select className="form-select" value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}>
              <option value="">Select employee…</option>
              {employees.filter(e => e.status === 'Active').map(e => (
                <option key={e.id} value={e.id}>{e.user?.name} ({e.empNo})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Leave Type</label>
            <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">From Date *</label><input type="date" className="form-input" value={form.fromDate} onChange={e => setForm(p => ({ ...p, fromDate: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">To Date *</label><input type="date" className="form-input" value={form.toDate} onChange={e => setForm(p => ({ ...p, toDate: e.target.value }))} /></div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" placeholder="Optional reason or notes…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </Modal>
      </main>
    </div>
  );
}
