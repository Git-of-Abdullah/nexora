'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import { KPICard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { BookOpen, FileText, Receipt, BarChart3, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function fmtMoney(n) { return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmt(n)      { return n === null || n === undefined ? '—' : Number(n).toLocaleString(); }

const QUICK = [
  { href: '/accounting/invoices', label: 'Invoices',         icon: FileText,  color: 'var(--accent)'   },
  { href: '/accounting/bills',    label: 'Bills / Payables', icon: Receipt,   color: 'var(--warning)'  },
  { href: '/accounting/reports',  label: 'Financial Reports', icon: BarChart3, color: 'var(--success)'  },
];

export default function AccountingPage() {
  const [invoices, setInvoices] = useState([]);
  const [bills,    setBills]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/accounting/invoices'),
      api.get('/accounting/bills'),
    ]).then(([inv, bil]) => {
      if (inv.status === 'fulfilled') setInvoices(inv.value);
      if (bil.status === 'fulfilled') setBills(bil.value);
    }).finally(() => setLoading(false));
  }, []);

  const paid        = invoices.filter(i => i.status === 'Paid');
  const open        = invoices.filter(i => ['Pending','Sent','Partial'].includes(i.status));
  const overdueInv  = invoices.filter(i => i.effectiveStatus === 'Overdue' || i.status === 'Overdue');
  const overdueBils = bills.filter(b => b.effectiveStatus === 'Overdue' || b.status === 'Overdue');
  const totalRev    = paid.reduce((s, i) => s + Number(i.amount || 0) + Number(i.tax || 0), 0);
  const totalPay    = bills.filter(b => b.status !== 'Paid').reduce((s, b) => s + Number(b.amount || 0), 0);

  return (
    <div className="page-wrapper">
      <Topbar title="Accounting" subtitle="Financial management — invoices, bills, reports" />
      <main className="page-main">

        {/* KPIs */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <KPICard label="Total Revenue"       value={loading ? '…' : fmtMoney(totalRev)}       icon={TrendingUp}   iconBg="rgba(30,107,60,0.1)"   iconColor="var(--success)" trendLabel={`${paid.length} paid invoices`} />
          <KPICard label="Open Invoices"       value={loading ? '…' : fmt(open.length)}          icon={FileText}     iconBg="var(--accent-light)"   iconColor="var(--accent)"  trendLabel="awaiting payment" />
          <KPICard label="Overdue Invoices"    value={loading ? '…' : fmt(overdueInv.length)}    icon={TrendingDown}  iconBg="var(--danger-bg)"     iconColor="var(--danger)"  trend={overdueInv.length > 0 ? 'down' : null} trendLabel="need follow-up" />
          <KPICard label="Outstanding Payables" value={loading ? '…' : fmtMoney(totalPay)}       icon={Receipt}      iconBg="var(--warning-bg)"     iconColor="var(--warning)" trendLabel={`${overdueBils.length} overdue bills`} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Quick links */}
          <div className="card">
            <div className="card-header"><div className="card-title">Accounting Modules</div></div>
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUICK.map(({ href, label, icon: Icon, color }) => (
                <Link key={href} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                  borderRadius: 8, border: '1px solid var(--border)', textDecoration: 'none',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'none'; }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent invoices */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Invoices</div>
              <Link href="/accounting/invoices" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>View all</Link>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Client</th><th style={{ textAlign:'right' }}>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
                  ) : invoices.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No invoices yet</td></tr>
                  ) : invoices.slice(0, 6).map(inv => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 500 }}>{inv.clientName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(Number(inv.amount) + Number(inv.tax || 0))}</td>
                      <td><Badge status={inv.effectiveStatus || inv.status} /></td>
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
