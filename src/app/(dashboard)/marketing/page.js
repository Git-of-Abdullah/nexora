'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import { KPICard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { Megaphone, Target, UserPlus, Users, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function fmt(n) { return n === null || n === undefined ? '—' : Number(n).toLocaleString(); }
function fmtMoney(n) { return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

const QUICK = [
  { href: '/marketing/campaigns', label: 'Campaigns',   icon: Target,   color: 'var(--accent)'  },
  { href: '/marketing/leads',     label: 'Lead Pipeline', icon: UserPlus, color: '#7C3AED'       },
];

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [leads,     setLeads]     = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/marketing/campaigns'),
      api.get('/marketing/leads'),
    ]).then(([c, l]) => {
      if (c.status === 'fulfilled') setCampaigns(c.value);
      if (l.status === 'fulfilled') setLeads(l.value);
    }).finally(() => setLoading(false));
  }, []);

  const active    = campaigns.filter(c => c.status === 'Active').length;
  const totalBudg = campaigns.reduce((s, c) => s + Number(c.budget || 0), 0);
  const newLeads  = leads.filter(l => l.status === 'New').length;
  const won       = leads.filter(l => l.status === 'Won').length;

  const leadStages = ['New','Contacted','Qualified','Proposal Sent','Won','Lost'];

  return (
    <div className="page-wrapper">
      <Topbar title="Marketing" subtitle="Campaign management, lead pipeline & CRM" />
      <main className="page-main">

        {/* KPIs */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <KPICard label="Active Campaigns"  value={loading ? '…' : fmt(active)}          icon={Megaphone} iconBg="rgba(124,58,237,0.1)" iconColor="#7C3AED"       trendLabel={`${campaigns.length} total`} />
          <KPICard label="Total Budget"      value={loading ? '…' : fmtMoney(totalBudg)}  icon={TrendingUp} iconBg="var(--accent-light)" iconColor="var(--accent)"  trendLabel="all campaigns" />
          <KPICard label="New Leads"         value={loading ? '…' : fmt(newLeads)}         icon={UserPlus}  iconBg="var(--warning-bg)"    iconColor="var(--warning)" trendLabel="awaiting contact" />
          <KPICard label="Won Deals"         value={loading ? '…' : fmt(won)}              icon={Users}     iconBg="rgba(30,107,60,0.1)"  iconColor="var(--success)" trendLabel="converted" trend={won > 0 ? 'up' : null} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Quick links */}
          <div className="card">
            <div className="card-header"><div className="card-title">Marketing Modules</div></div>
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

              {/* Lead stage funnel */}
              <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Lead Pipeline</div>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 12, borderRadius: 4, marginBottom: 6 }} />)
                ) : leadStages.map(stage => {
                  const count = leads.filter(l => l.status === stage).length;
                  const pct   = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                  return (
                    <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: '0.75rem', minWidth: 100, color: 'var(--text-secondary)' }}>{stage}</span>
                      <div style={{ flex: 1, height: 5, background: 'var(--bg)', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: stage === 'Won' ? 'var(--success)' : stage === 'Lost' ? 'var(--danger)' : 'var(--accent)', borderRadius: 99, transition: 'width 0.5s' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: 20, textAlign: 'right' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent campaigns */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Campaigns</div>
              <Link href="/marketing/campaigns" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>View all</Link>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Campaign</th><th>Type</th><th style={{ textAlign:'right' }}>Budget</th><th>Status</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
                  ) : campaigns.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No campaigns yet</td></tr>
                  ) : campaigns.slice(0, 6).map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td className="td-muted">{c.type}</td>
                      <td style={{ textAlign:'right', fontWeight: 500 }}>{fmtMoney(c.budget)}</td>
                      <td><Badge status={c.status} /></td>
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
