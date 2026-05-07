'use client';

import { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { Play, RefreshCw, DollarSign, Users, TrendingDown } from 'lucide-react';

function fmtMoney(n) { return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function PayrollPage() {
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);

  const now = new Date();
  const [filterMonth, setFMonth] = useState(String(now.getMonth() + 1));
  const [filterYear,  setFYear]  = useState(String(now.getFullYear()));

  const [runOpen, setRunOpen]     = useState(false);
  const [runMonth, setRunMonth]   = useState(String(now.getMonth() + 1));
  const [runYear,  setRunYear]    = useState(String(now.getFullYear()));
  const [postJournal, setPostJournal] = useState(true);
  const [running, setRunning]     = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runError,  setRunError]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMonth) params.set('month', filterMonth);
      if (filterYear)  params.set('year',  filterYear);
      const data = await api.get(`/hr/payroll?${params}`);
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear]);

  useEffect(() => { load(); }, [load]);

  /* ── Totals ── */
  const totals = records.reduce(
    (acc, r) => ({
      base:       acc.base       + Number(r.baseSalary || 0),
      deductions: acc.deductions + Number(r.deductions || 0),
      net:        acc.net        + Number(r.netPay     || 0),
    }),
    { base: 0, deductions: 0, net: 0 }
  );

  /* ── Run Payroll ── */
  async function handleRun() {
    setRunError('');
    setRunning(true);
    setRunResult(null);
    try {
      const result = await api.post('/hr/payroll/run', {
        period:        `${runYear}-${String(runMonth).padStart(2, '0')}`,
        postToJournal: postJournal,
      });
      setRunResult(result);
      // Refresh table if viewing that period
      if (filterMonth === runMonth && filterYear === runYear) load();
    } catch (err) {
      setRunError(err?.error || 'Payroll run failed.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="page-wrapper">
      <Topbar title="Payroll" subtitle="Monthly payroll records & processing" />
      <main className="page-main">

        {/* Totals */}
        <div className="grid-3" style={{ marginBottom: 24 }}>
          <div className="kpi-card">
            <div className="kpi-icon-wrap" style={{ background: 'var(--accent-light)' }}><DollarSign size={22} style={{ color: 'var(--accent)' }} /></div>
            <div className="kpi-label">Total Base Salary</div>
            <div className="kpi-value">{loading ? '…' : fmtMoney(totals.base)}</div>
            <div className="kpi-sub">{records.length} employee records</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon-wrap" style={{ background: 'var(--danger-bg)' }}><TrendingDown size={22} style={{ color: 'var(--danger)' }} /></div>
            <div className="kpi-label">Total Deductions</div>
            <div className="kpi-value" style={{ color: 'var(--danger)' }}>{loading ? '…' : fmtMoney(totals.deductions)}</div>
            <div className="kpi-sub">Tax &amp; insurance</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon-wrap" style={{ background: 'rgba(30,107,60,0.1)' }}><Users size={22} style={{ color: 'var(--success)' }} /></div>
            <div className="kpi-label">Total Net Pay</div>
            <div className="kpi-value" style={{ color: 'var(--success)' }}>{loading ? '…' : fmtMoney(totals.net)}</div>
            <div className="kpi-sub">After deductions</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="filters-row" style={{ marginBottom: 16 }}>
          <select className="form-select" style={{ width: 'auto' }} value={filterMonth} onChange={e => setFMonth(e.target.value)}>
            {MONTH_NAMES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={filterYear} onChange={e => setFYear(e.target.value)}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" onClick={() => { setRunOpen(true); setRunResult(null); setRunError(''); }}>
            <Play size={14} /> Run Payroll
          </button>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                Payroll — {MONTH_NAMES[parseInt(filterMonth) - 1]} {filterYear}
              </div>
              <div className="card-subtitle">{records.length} employee payslips</div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Emp No</th>
                  <th style={{ textAlign: 'right' }}>Base Salary</th>
                  <th style={{ textAlign: 'right' }}>Deductions</th>
                  <th style={{ textAlign: 'right' }}>Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4, width: j >= 3 ? '60%' : '75%' }} /></td>
                    ))}</tr>
                  ))
                ) : records.length === 0 ? (
                  <tr><td colSpan={6}>
                    <EmptyState
                      icon={DollarSign}
                      title="No payroll records"
                      message={`No payroll has been run for ${MONTH_NAMES[parseInt(filterMonth) - 1]} ${filterYear} yet.`}
                      action={<button className="btn btn-primary btn-sm" onClick={() => { setRunOpen(true); setRunResult(null); setRunError(''); }}><Play size={13} /> Run Payroll Now</button>}
                    />
                  </td></tr>
                ) : records.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.employee?.user?.name || '—'}</td>
                    <td className="td-muted">{r.employee?.department?.name || '—'}</td>
                    <td className="td-mono">{r.employee?.empNo || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmtMoney(r.baseSalary)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmtMoney(r.deductions)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{fmtMoney(r.netPay)}</td>
                  </tr>
                ))}
                {records.length > 0 && (
                  <tr style={{ background: 'var(--bg)', borderTop: '2px solid var(--border)' }}>
                    <td colSpan={3} style={{ fontWeight: 700, padding: '12px 16px' }}>Total</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMoney(totals.base)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>{fmtMoney(totals.deductions)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{fmtMoney(totals.net)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Run Payroll Modal */}
        <Modal open={runOpen} onClose={() => { if (!running) setRunOpen(false); }} title="Run Payroll"
          footer={runResult ? (
            <button className="btn btn-primary btn-sm" onClick={() => setRunOpen(false)}>Close</button>
          ) : (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setRunOpen(false)} disabled={running}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleRun} disabled={running}>
                <Play size={13} /> {running ? 'Processing…' : 'Confirm & Run'}
              </button>
            </>
          )}
        >
          {runResult ? (
            <div>
              <div className="alert alert-success" style={{ marginBottom: 16 }}>
                ✓ Payroll run complete for {records.length > 0 ? '' : ''}{MONTH_NAMES[parseInt(runMonth) - 1]} {runYear}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  ['Records processed', runResult.records],
                  ['Total Base',        fmtMoney(runResult.totals?.baseSalary)],
                  ['Total Deductions',  fmtMoney(runResult.totals?.deductions)],
                  ['Total Net Pay',     fmtMoney(runResult.totals?.netPay)],
                  ['Journal posted',    runResult.journalPosted ? `Yes (ID: ${runResult.journalId})` : 'No'],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{l}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {runError && <div className="alert alert-error">{runError}</div>}
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                This will generate payroll records for all <strong>Active</strong> employees for the selected period. If the period already has records, they will be updated.
              </p>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Month</label>
                  <select className="form-select" value={runMonth} onChange={e => setRunMonth(e.target.value)}>
                    {MONTH_NAMES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Year</label>
                  <select className="form-select" value={runYear} onChange={e => setRunYear(e.target.value)}>
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={postJournal} onChange={e => setPostJournal(e.target.checked)} />
                <span>Post to General Ledger (Journal Entry)</span>
              </label>
            </>
          )}
        </Modal>
      </main>
    </div>
  );
}
