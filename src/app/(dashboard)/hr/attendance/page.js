'use client';

import { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Search, Plus, RefreshCw, Calendar, Clock, AlertCircle } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d)  { if (!d) return '—'; const dt = new Date(d); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; }
function fmtTime(d)  { if (!d) return '—'; return new Date(d).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
function calcHours(i, o) { if (!i||!o) return '—'; const h=(new Date(o)-new Date(i))/3600000; return h>0?`${h.toFixed(1)}h`:'—'; }

const STATUS_OPTS = ['Present','Absent','Late','Half Day','On Leave'];
const HR_ROLES    = ['super_admin','hr_manager','hr_staff'];

/* Module-level form — prevents focus loss */
function AttendanceForm({ form, setForm, employees, isHR, formError }) {
  return (
    <>
      {formError && (
        <div className="alert alert-error" style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <AlertCircle size={14}/> {formError}
        </div>
      )}
      {isHR && (
        <div className="form-group">
          <label className="form-label">Employee *</label>
          <select className="form-select" value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}>
            <option value="">Select employee…</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.user?.name} ({e.empNo})</option>
            ))}
          </select>
        </div>
      )}
      {!isHR && form._empName && (
        <div className="form-group">
          <label className="form-label">Employee</label>
          <input className="form-input" value={form._empName} disabled style={{ background:'var(--bg)', color:'var(--text-muted)' }} />
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input type="date" className="form-input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
            {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Clock In</label><input type="time" className="form-input" value={form.clockIn} onChange={e => setForm(p => ({ ...p, clockIn: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Clock Out</label><input type="time" className="form-input" value={form.clockOut} onChange={e => setForm(p => ({ ...p, clockOut: e.target.value }))} /></div>
      </div>
    </>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  const isHR     = HR_ROLES.includes(user?.role);

  const [records,   setRecords]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [myEmp,     setMyEmp]     = useState(null);   // current user's employee record
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filterStatus, setStatus] = useState('');

  const today    = new Date();
  const thirtyAgo= new Date(today); thirtyAgo.setDate(today.getDate() - 30);
  const [from, setFrom] = useState(thirtyAgo.toISOString().split('T')[0]);
  const [to,   setTo]   = useState(today.toISOString().split('T')[0]);

  const [addOpen,   setAddOpen]   = useState(false);
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  const makeEmptyForm = useCallback((emp) => ({
    employeeId: emp ? String(emp.id) : '',
    _empName:   emp ? emp.user?.name : '',
    date:       new Date().toISOString().split('T')[0],
    clockIn:    '09:00',
    clockOut:   '',
    status:     'Present',
  }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to)   params.set('to',   to);

      if (isHR) {
        // HR: load all records + employee list
        const [att, emp] = await Promise.all([
          api.get(`/hr/attendance?${params}`),
          api.get('/hr/employees'),
        ]);
        setRecords(att);
        setEmployees(emp);
      } else {
        // Regular employee: resolve own employee record first, then load only their attendance
        let emp = myEmp;
        if (!emp) {
          emp = await api.get('/hr/me');
          setMyEmp(emp);
        }
        if (emp) {
          params.set('employeeId', emp.id);
          const att = await api.get(`/hr/attendance?${params}`);
          setRecords(att);
        }
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, isHR, myEmp]);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter(r => {
    const name = (r.employee?.user?.name || '').toLowerCase();
    return (!search || name.includes(search.toLowerCase())) &&
           (!filterStatus || r.status === filterStatus);
  });

  const summary = {
    present: records.filter(r => r.status === 'Present').length,
    absent:  records.filter(r => r.status === 'Absent').length,
    late:    records.filter(r => r.status === 'Late').length,
    onLeave: records.filter(r => r.status === 'On Leave').length,
  };

  function openAdd() {
    const emp = isHR ? null : myEmp;
    setForm(makeEmptyForm(emp));
    setFormError('');
    setAddOpen(true);
  }

  async function handleSave() {
    setFormError('');
    if (!form.employeeId) { setFormError('Please select an employee.'); return; }
    if (!form.date)        { setFormError('Date is required.'); return; }
    setSaving(true);
    try {
      const record = await api.post('/hr/attendance', {
        employeeId: parseInt(form.employeeId),
        date:       form.date,
        clockIn:    form.clockIn  ? `${form.date}T${form.clockIn}:00`  : undefined,
        clockOut:   form.clockOut ? `${form.date}T${form.clockOut}:00` : undefined,
        status:     form.status,
      });
      // Re-fetch to get full employee include
      load();
      setAddOpen(false);
    } catch (err) {
      setFormError(err?.error || 'Failed to log attendance.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-wrapper">
      <Topbar title="Attendance" subtitle={isHR ? 'Daily attendance register — all employees' : 'My attendance record'} />
      <main className="page-main">

        {/* Summary chips */}
        <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { label:'Present',  value:summary.present,  cls:'badge-success'  },
            { label:'Absent',   value:summary.absent,   cls:'badge-danger'   },
            { label:'Late',     value:summary.late,     cls:'badge-warning'  },
            { label:'On Leave', value:summary.onLeave,  cls:'badge-neutral'  },
          ].map(({ label, value, cls }) => (
            <div key={label} className={`badge ${cls}`} style={{ padding:'6px 14px', fontSize:'0.8125rem' }}>
              {label}: <strong style={{ marginLeft:4 }}>{value}</strong>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="filters-row" style={{ marginBottom:16 }}>
          {isHR && (
            <div style={{ position:'relative', flex:'1 1 180px', maxWidth:240 }}>
              <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
              <input className="form-input" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft:32 }}/>
            </div>
          )}
          <select className="form-select" style={{ width:'auto' }} value={filterStatus} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Calendar size={14} style={{ color:'var(--text-muted)' }}/>
            <input type="date" className="form-input" style={{ width:'auto' }} value={from} onChange={e => setFrom(e.target.value)}/>
            <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>to</span>
            <input type="date" className="form-input" style={{ width:'auto' }} value={to} onChange={e => setTo(e.target.value)}/>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/></button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={14}/> {isHR ? 'Log Attendance' : 'Clock In / Log'}
          </button>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Attendance Register</div>
              <div className="card-subtitle">{filtered.length} records · {from} → {to}</div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {isHR && <th>Employee</th>}
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length:6 }).map((_,i) => (
                    <tr key={i}>{Array.from({ length: isHR ? 6 : 5 }).map((_,j) => (
                      <td key={j}><div className="skeleton" style={{ height:14, borderRadius:4, width:'75%' }}/></td>
                    ))}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={isHR ? 6 : 5}>
                    <EmptyState icon={Clock} title="No attendance records" message="Adjust date range or log new attendance."/>
                  </td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id}>
                    {isHR && <td style={{ fontWeight:600 }}>{r.employee?.user?.name || '—'}</td>}
                    <td className="td-muted">{fmtDate(r.date)}</td>
                    <td className="td-mono">{fmtTime(r.clockIn)}</td>
                    <td className="td-mono">{fmtTime(r.clockOut)}</td>
                    <td style={{ fontWeight:500 }}>{calcHours(r.clockIn, r.clockOut)}</td>
                    <td><Badge status={r.status}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Modal open={addOpen} onClose={() => setAddOpen(false)} title={isHR ? 'Log Attendance' : 'Clock In / Log My Attendance'} size="md"
          footer={<>
            <button className="btn btn-secondary btn-sm" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Record'}</button>
          </>}
        >
          <AttendanceForm form={form} setForm={setForm} employees={employees} isHR={isHR} formError={formError}/>
        </Modal>
      </main>
    </div>
  );
}
