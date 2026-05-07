'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import { KPICard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { Factory, Package, ClipboardCheck, Cpu, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const ORDER_STATUSES = ['Draft','Scheduled','In Production','Quality Check','Completed','Cancelled'];

function fmt(n) { return n === null || n === undefined ? '—' : Number(n).toLocaleString(); }

const QUICK = [
  { href: '/manufacturing/orders',   label: 'Production Orders', icon: Factory,       color: 'var(--accent)' },
  { href: '/manufacturing/inventory',label: 'Raw Materials',      icon: Package,       color: 'var(--warning)' },
  { href: '/manufacturing/quality',  label: 'Quality Checks',    icon: ClipboardCheck, color: 'var(--success)' },
];

export default function ManufacturingPage() {
  const [orders,    setOrders]    = useState([]);
  const [inventory, setInventory] = useState([]);
  const [quality,   setQuality]   = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/manufacturing/orders'),
      api.get('/manufacturing/inventory'),
      api.get('/manufacturing/quality-checks'),
    ]).then(([o, i, q]) => {
      if (o.status === 'fulfilled') setOrders(o.value);
      if (i.status === 'fulfilled') setInventory(i.value);
      if (q.status === 'fulfilled') setQuality(q.value);
    }).finally(() => setLoading(false));
  }, []);

  const inProd   = orders.filter(o => o.status === 'In Production').length;
  const qcPend   = orders.filter(o => o.status === 'Quality Check').length;
  const lowStock = inventory.filter(m => m.stockStatus === 'low' || m.stockStatus === 'out').length;
  const passRate = quality.length > 0
    ? Math.round((quality.filter(q => q.result === 'Pass').length / quality.length) * 100)
    : null;

  return (
    <div className="page-wrapper">
      <Topbar title="Manufacturing" subtitle="Production lifecycle — orders, inventory, quality" />
      <main className="page-main">

        {/* KPIs */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <KPICard label="Total Orders"      value={loading ? '…' : fmt(orders.length)}  icon={Factory}       iconBg="var(--accent-light)"       iconColor="var(--accent)"  trendLabel={`${inProd} in production`} trend={inProd > 0 ? 'up' : null} />
          <KPICard label="Quality Check Queue" value={loading ? '…' : fmt(qcPend)}       icon={ClipboardCheck} iconBg="rgba(124,58,237,0.1)"      iconColor="#7C3AED"       trendLabel="pending QC" />
          <KPICard label="Low / Out of Stock" value={loading ? '…' : fmt(lowStock)}      icon={AlertTriangle}  iconBg="var(--warning-bg)"         iconColor="var(--warning)" trend={lowStock > 0 ? 'down' : null} trendLabel="materials need reorder" />
          <KPICard label="QC Pass Rate"       value={loading ? '…' : passRate !== null ? `${passRate}%` : '—'} icon={Cpu} iconBg="rgba(30,107,60,0.1)" iconColor="var(--success)" trendLabel={`${quality.length} checks total`} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Order status breakdown */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Factory size={15} style={{ color: 'var(--accent)' }} /> Order Breakdown
              </div>
              <Link href="/manufacturing/orders" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>View all</Link>
            </div>
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 14, borderRadius: 4, marginBottom: 6 }} />)
                : ORDER_STATUSES.map(s => {
                    const count = orders.filter(o => o.status === s).length;
                    const pct   = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                    return (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                        <Badge status={s} dot={false} />
                        <div style={{ flex: 1, height: 5, background: 'var(--bg)', borderRadius: 99 }}>
                          <div style={{ height: '100%', borderRadius: 99, background: 'var(--accent)', width: `${pct}%`, transition: 'width 0.5s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: 24, textAlign: 'right' }}>{count}</span>
                      </div>
                    );
                  })
              }
            </div>
          </div>

          {/* Quick links + Low stock alerts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Quick links */}
            <div className="card">
              <div className="card-header"><div className="card-title">Modules</div></div>
              <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {QUICK.map(({ href, label, icon: Icon, color }) => (
                  <Link key={href} href={href} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    borderRadius: 8, border: '1px solid var(--border)', textDecoration: 'none',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'var(--bg)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'none'; }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} style={{ color }} />
                    </div>
                    <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
                    <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </Link>
                ))}
              </div>
            </div>

            {/* Low stock */}
            {!loading && lowStock > 0 && (
              <div className="card" style={{ borderColor: 'var(--warning)' }}>
                <div className="card-header" style={{ background: 'var(--warning-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={15} style={{ color: 'var(--warning)' }} />
                    <span className="card-title" style={{ color: 'var(--warning)' }}>Low Stock Alerts</span>
                  </div>
                </div>
                <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {inventory.filter(m => m.stockStatus !== 'ok').slice(0, 5).map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{m.name}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: m.stockStatus === 'out' ? 'var(--danger)' : 'var(--warning)' }}>
                        {m.stockQty} {m.unit} {m.stockStatus === 'out' ? '(OUT)' : '(LOW)'}
                      </span>
                    </div>
                  ))}
                  {lowStock > 5 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>+{lowStock - 5} more…</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
