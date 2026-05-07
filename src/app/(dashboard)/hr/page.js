'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import { KPICard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { Users, UserCheck, UserX, Clock, Briefcase, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function fmt(n) { return n === null || n === undefined ? '—' : Number(n).toLocaleString(); }

const QUICK_LINKS = [
  { href: '/hr/employees',  label: 'Employee Directory', icon: Users,     color: 'var(--accent)' },
  { href: '/hr/attendance', label: 'Attendance Register', icon: Clock,    color: 'var(--warning)' },
  { href: '/hr/leave',      label: 'Leave Requests',     icon: Briefcase, color: 'var(--success)' },
  { href: '/hr/payroll',    label: 'Payroll',            icon: TrendingUp, color: '#7C3AED' },
];

export default function HRPage() {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves]       = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/hr/employees'),
      api.get('/hr/leave-requests'),
    ]).then(([emp, lv]) => {
      if (emp.status === 'fulfilled') setEmployees(emp.value);
      if (lv.status  === 'fulfilled') setLeaves(lv.value);
    }).finally(() => setLoading(false));
  }, []);

  const active   = employees.filter(e => e.status === 'Active').length;
  const inactive = employees.filter(e => e.status === 'Inactive').length;
  const pending  = leaves.filter(l => l.status === 'Pending').length;

  return (
    <div className="page-wrapper">
      <Topbar title="Human Resources" subtitle="Manage employees, attendance, leave and payroll" />
      <main className="page-main">

        {/* KPIs */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <KPICard label="Total Employees"  value={loading ? '…' : fmt(employees.length)} icon={Users}     iconBg="var(--accent-light)"           iconColor="var(--accent)"   trendLabel="all records" />
          <KPICard label="Active"           value={loading ? '…' : fmt(active)}           icon={UserCheck}  iconBg="rgba(30,107,60,0.1)"           iconColor="var(--success)"  trendLabel="currently employed" />
          <KPICard label="Inactive"         value={loading ? '…' : fmt(inactive)}         icon={UserX}      iconBg="var(--danger-bg)"              iconColor="var(--danger)"   trendLabel="offboarded" />
          <KPICard label="Pending Leave"    value={loading ? '…' : fmt(pending)}          icon={Briefcase}  iconBg="var(--warning-bg)"             iconColor="var(--warning)"  trend={pending > 0 ? 'down' : null} trendLabel="awaiting approval" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Quick links */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">HR Modules</div>
            </div>
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUICK_LINKS.map(({ href, label, icon: Icon, color }) => (
                <Link key={href} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', textDecoration: 'none',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'none'; }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent leave requests */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Leave Requests</div>
              <Link href="/hr/leave" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>View all</Link>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Loading…</td></tr>
                  ) : leaves.length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No leave requests</td></tr>
                  ) : leaves.slice(0, 6).map(l => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 500 }}>{l.employee?.user?.name || '—'}</td>
                      <td className="td-muted">{l.type}</td>
                      <td><Badge status={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
