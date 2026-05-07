'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import { KPICard } from '@/components/ui/Card';
import api from '@/lib/api';
import {
  Factory, Users, FileText, Megaphone,
  TrendingUp, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';

/* ─── helpers ─── */
function fmt(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString();
}
function fmtCurrency(n) {
  if (n === null || n === undefined) return '—';
  return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ─── Mini stat row inside a card ─── */
function StatItem({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 0',
      borderBottom: '1px solid var(--border-light)',
    }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{
        fontSize: '0.8125rem', fontWeight: 700,
        color: accent ? 'var(--accent)' : 'var(--text-primary)',
      }}>{value}</span>
    </div>
  );
}

/* ─── Activity item ─── */
function ActivityItem({ icon: Icon, iconBg, iconColor, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} style={{ color: iconColor }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [orders, employees, invoices, campaigns, bills] = await Promise.allSettled([
          api.get('/manufacturing/orders'),
          api.get('/hr/employees'),
          api.get('/accounting/invoices'),
          api.get('/marketing/campaigns'),
          api.get('/accounting/bills'),
        ]);

        const ord  = orders.status     === 'fulfilled' ? orders.value     : [];
        const emp  = employees.status  === 'fulfilled' ? employees.value  : [];
        const inv  = invoices.status   === 'fulfilled' ? invoices.value   : [];
        const camp = campaigns.status  === 'fulfilled' ? campaigns.value  : [];
        const bil  = bills.status      === 'fulfilled' ? bills.value      : [];

        setData({ ord, emp, inv, camp, bil });
      } catch {
        setData({ ord: [], emp: [], inv: [], camp: [], bil: [] });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Derived KPIs ── */
  const kpis = data ? (() => {
    const { ord, emp, inv, camp, bil } = data;

    const activeOrders    = ord.filter(o => o.status === 'In Production').length;
    const completedOrders = ord.filter(o => o.status === 'Completed').length;
    const activeEmp       = emp.filter(e => e.status === 'Active').length;
    const openInvoices    = inv.filter(i => ['Pending', 'Sent', 'Partial'].includes(i.status)).length;
    const overdueInvoices = inv.filter(i => i.status === 'Overdue').length;
    const totalRevenue    = inv.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.amount || 0), 0);
    const activeCamps     = camp.filter(c => c.status === 'Active').length;
    const pendingBills    = bil.filter(b => b.status === 'Unpaid').length;
    const overdueBills    = bil.filter(b => b.status === 'Overdue').length;

    return {
      activeOrders, completedOrders, totalOrders: ord.length,
      activeEmp, totalEmp: emp.length,
      openInvoices, overdueInvoices, totalRevenue,
      activeCamps, totalCamps: camp.length,
      pendingBills, overdueBills,
    };
  })() : null;

  return (
    <div className="page-wrapper">
      <Topbar
        title="Dashboard"
        subtitle="Welcome back — here's what's happening across all departments."
      />

      <main className="page-main">
        {/* ── KPI Cards ── */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <KPICard
            label="Production Orders"
            value={loading ? '…' : fmt(kpis?.totalOrders)}
            icon={Factory}
            iconBg="rgba(46,117,182,0.1)"
            iconColor="var(--accent)"
            trend={kpis?.activeOrders > 0 ? 'up' : null}
            trendLabel={loading ? '' : `${kpis?.activeOrders} in production`}
          />
          <KPICard
            label="Active Employees"
            value={loading ? '…' : fmt(kpis?.activeEmp)}
            icon={Users}
            iconBg="rgba(30,107,60,0.1)"
            iconColor="var(--success)"
            trendLabel={loading ? '' : `${kpis?.totalEmp} total headcount`}
          />
          <KPICard
            label="Open Invoices"
            value={loading ? '…' : fmt(kpis?.openInvoices)}
            icon={FileText}
            iconBg={kpis?.overdueInvoices > 0 ? 'var(--danger-bg)' : 'var(--warning-bg)'}
            iconColor={kpis?.overdueInvoices > 0 ? 'var(--danger)' : 'var(--warning)'}
            trend={kpis?.overdueInvoices > 0 ? 'down' : null}
            trendLabel={loading ? '' : kpis?.overdueInvoices > 0 ? `${kpis.overdueInvoices} overdue` : 'All on track'}
          />
          <KPICard
            label="Active Campaigns"
            value={loading ? '…' : fmt(kpis?.activeCamps)}
            icon={Megaphone}
            iconBg="rgba(124,58,237,0.1)"
            iconColor="#7C3AED"
            trendLabel={loading ? '' : `${kpis?.totalCamps} total campaigns`}
          />
        </div>

        {/* ── Lower grid: Module breakdowns + Activity ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

          {/* Manufacturing breakdown */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Factory size={15} style={{ color: 'var(--accent)' }} />
                  Manufacturing
                </div>
                <div className="card-subtitle">Production order breakdown</div>
              </div>
            </div>
            <div className="card-pad">
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 16, borderRadius: 4 }} />)}
                </div>
              ) : (
                <>
                  <StatItem label="Draft"        value={fmt(data?.ord.filter(o => o.status === 'Draft').length)} />
                  <StatItem label="Scheduled"    value={fmt(data?.ord.filter(o => o.status === 'Scheduled').length)} />
                  <StatItem label="In Production" value={fmt(data?.ord.filter(o => o.status === 'In Production').length)} accent />
                  <StatItem label="Quality Check" value={fmt(data?.ord.filter(o => o.status === 'Quality Check').length)} />
                  <StatItem label="Completed"    value={fmt(data?.ord.filter(o => o.status === 'Completed').length)} />
                  <div style={{ marginTop: 14 }}>
                    <a href="/manufacturing/orders" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                      View all orders →
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Accounting breakdown */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={15} style={{ color: 'var(--success)' }} />
                  Accounting
                </div>
                <div className="card-subtitle">Invoices & bills summary</div>
              </div>
            </div>
            <div className="card-pad">
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 16, borderRadius: 4 }} />)}
                </div>
              ) : (
                <>
                  <StatItem label="Total Revenue (Paid)"  value={fmtCurrency(kpis?.totalRevenue)} accent />
                  <StatItem label="Open Invoices"         value={fmt(kpis?.openInvoices)} />
                  <StatItem label="Overdue Invoices"      value={fmt(kpis?.overdueInvoices)} />
                  <StatItem label="Unpaid Bills"          value={fmt(kpis?.pendingBills)} />
                  <StatItem label="Overdue Bills"         value={fmt(kpis?.overdueBills)} />
                  <div style={{ marginTop: 14 }}>
                    <a href="/accounting/invoices" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                      View invoices →
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Marketing breakdown */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Megaphone size={15} style={{ color: '#7C3AED' }} />
                  Marketing
                </div>
                <div className="card-subtitle">Campaign & lead pipeline</div>
              </div>
            </div>
            <div className="card-pad">
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 16, borderRadius: 4 }} />)}
                </div>
              ) : (
                <>
                  <StatItem label="Total Campaigns"  value={fmt(kpis?.totalCamps)} />
                  <StatItem label="Active"            value={fmt(kpis?.activeCamps)} accent />
                  <StatItem label="Planning"          value={fmt(data?.camp.filter(c => c.status === 'Planning').length)} />
                  <StatItem label="Paused"            value={fmt(data?.camp.filter(c => c.status === 'Paused').length)} />
                  <StatItem label="Ended"             value={fmt(data?.camp.filter(c => c.status === 'Ended').length)} />
                  <div style={{ marginTop: 14 }}>
                    <a href="/marketing/campaigns" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                      View campaigns →
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick Links ── */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Quick Access
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { href: '/manufacturing/orders', label: 'New Production Order', icon: Factory, bg: 'var(--accent-light)', color: 'var(--accent)' },
              { href: '/hr/employees', label: 'Employee Directory', icon: Users, bg: 'rgba(30,107,60,0.08)', color: 'var(--success)' },
              { href: '/accounting/invoices', label: 'Create Invoice', icon: FileText, bg: 'var(--warning-bg)', color: 'var(--warning)' },
              { href: '/marketing/leads', label: 'Manage Leads', icon: Megaphone, bg: 'rgba(124,58,237,0.08)', color: '#7C3AED' },
              { href: '/accounting/reports', label: 'Financial Reports', icon: TrendingUp, bg: 'rgba(30,107,60,0.08)', color: 'var(--success)' },
              { href: '/hr/attendance', label: 'Attendance Register', icon: Clock, bg: 'rgba(46,117,182,0.08)', color: 'var(--accent)' },
            ].map(({ href, label, icon: Icon, bg, color }) => (
              <a
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 14px', borderRadius: 8,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 500,
                  color: 'var(--text-primary)', transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 2px 8px rgba(0,0,0,0.06)`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} style={{ color }} />
                </div>
                {label}
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
