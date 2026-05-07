'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Bell, ChevronDown, AlertCircle, Receipt, Package, FileText, LogOut, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

const ROLE_NOTIFICATION_SOURCES = {
  super_admin: ['accounting', 'manufacturing', 'hr'],
  accountant: ['accounting'],
  manufacturing_manager: ['manufacturing'],
  manufacturing_staff: ['manufacturing'],
  hr_manager: ['hr'],
  hr_staff: ['hr'],
  marketing_manager: [],
  marketing_staff: [],
  general_employee: [],
};

function getNotificationSources(role) {
  return ROLE_NOTIFICATION_SOURCES[role] || [];
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ── Notification panel ── */
function NotificationPanel({ onClose, role }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const sources = getNotificationSources(role);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [invoices, bills, materials, leaves] = await Promise.allSettled([
          sources.includes('accounting') ? api.get('/accounting/invoices') : Promise.resolve([]),
          sources.includes('accounting') ? api.get('/accounting/bills') : Promise.resolve([]),
          sources.includes('manufacturing') ? api.get('/manufacturing/inventory') : Promise.resolve([]),
          sources.includes('hr') ? api.get('/hr/leave-requests') : Promise.resolve([]),
        ]);

        const notifs = [];

        // Overdue invoices
        if (invoices.status === 'fulfilled' && Array.isArray(invoices.value)) {
          invoices.value
            .filter(i => i.effectiveStatus === 'Overdue' || (i.status !== 'Paid' && new Date(i.dueDate) < new Date()))
            .forEach(i => notifs.push({
              id:   `inv-${i.id}`,
              icon: FileText,
              color: 'var(--danger)',
              bg:   'var(--danger-bg)',
              title: `Invoice overdue — ${i.clientName}`,
              sub:   `$${Number(i.amount).toLocaleString()} due`,
              href:  '/accounting/invoices',
            }));
        }

        // Overdue bills
        if (bills.status === 'fulfilled' && Array.isArray(bills.value)) {
          bills.value
            .filter(b => b.effectiveStatus === 'Overdue' || b.isOverdue)
            .forEach(b => notifs.push({
              id:   `bill-${b.id}`,
              icon: Receipt,
              color: 'var(--warning)',
              bg:   'var(--warning-bg)',
              title: `Bill overdue — ${b.supplierName}`,
              sub:   `$${Number(b.amount).toLocaleString()} unpaid`,
              href:  '/accounting/bills',
            }));
        }

        // Low / out-of-stock materials
        if (materials.status === 'fulfilled' && Array.isArray(materials.value)) {
          materials.value
            .filter(m => m.stockStatus === 'out' || m.stockStatus === 'low')
            .slice(0, 4)
            .forEach(m => notifs.push({
              id:   `mat-${m.id}`,
              icon: Package,
              color: m.stockStatus === 'out' ? 'var(--danger)' : 'var(--warning)',
              bg:   m.stockStatus === 'out' ? 'var(--danger-bg)' : 'var(--warning-bg)',
              title: m.stockStatus === 'out' ? `Out of stock — ${m.name}` : `Low stock — ${m.name}`,
              sub:   `${Number(m.stockQty)} ${m.unit} remaining`,
              href:  '/manufacturing/inventory',
            }));
        }

        // Pending leave requests
        if (leaves.status === 'fulfilled' && Array.isArray(leaves.value)) {
          leaves.value
            .filter(l => l.status === 'Pending')
            .slice(0, 3)
            .forEach(l => notifs.push({
              id:   `leave-${l.id}`,
              icon: AlertCircle,
              color: 'var(--accent)',
              bg:   'var(--accent-light)',
              title: `Leave request pending`,
              sub:   `${l.employee?.user?.name || 'Employee'} · ${l.type}`,
              href:  '/hr/leave',
            }));
        }

        setItems(notifs);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [role]);

  function handleClick(href) {
    router.push(href);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 29 }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: 'absolute', right: 0, top: 'calc(100% + 8px)',
        width: 340, maxHeight: 420,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
        zIndex: 30, display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.15s ease', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</div>
            {!loading && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{items.length} alerts requiring attention</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, borderRadius: 6 }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="skeleton" style={{ height: 12, borderRadius: 4, width: '75%' }} />
                    <div className="skeleton" style={{ height: 10, borderRadius: 4, width: '45%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Bell size={20} style={{ color: 'var(--success)' }} />
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>All clear!</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>No pending alerts</div>
            </div>
          ) : (
            <div style={{ padding: '6px' }}>
              {items.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.id} onClick={() => handleClick(item.href)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px', border: 'none', background: 'none',
                    borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} style={{ color: item.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                      <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: 1 }}>{item.sub}</div>
                    </div>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Topbar ── */
export default function Topbar({ title, subtitle }) {
  const { user, logout } = useAuth();
  const role = user?.role;
  const sources = getNotificationSources(role);
  const router = useRouter();
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const notifRef = useRef(null);

  // Load badge count on mount
  useEffect(() => {
    async function loadCount() {
      try {
        const [invoices, bills, materials, leaves] = await Promise.allSettled([
          sources.includes('accounting') ? api.get('/accounting/invoices') : Promise.resolve([]),
          sources.includes('accounting') ? api.get('/accounting/bills') : Promise.resolve([]),
          sources.includes('manufacturing') ? api.get('/manufacturing/inventory') : Promise.resolve([]),
          sources.includes('hr') ? api.get('/hr/leave-requests') : Promise.resolve([]),
        ]);
        let count = 0;
        if (invoices.status === 'fulfilled' && Array.isArray(invoices.value)) count += invoices.value.filter(i => i.effectiveStatus === 'Overdue' || (i.status !== 'Paid' && new Date(i.dueDate) < new Date())).length;
        if (bills.status === 'fulfilled' && Array.isArray(bills.value))    count += bills.value.filter(b => b.effectiveStatus === 'Overdue' || b.isOverdue).length;
        if (materials.status === 'fulfilled' && Array.isArray(materials.value)) count += materials.value.filter(m => m.stockStatus === 'out' || m.stockStatus === 'low').slice(0, 4).length;
        if (leaves.status === 'fulfilled' && Array.isArray(leaves.value))   count += leaves.value.filter(l => l.status === 'Pending').slice(0, 3).length;
        setNotifCount(count);
      } catch { /* silent */ }
    }
    loadCount();
  }, [role]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="topbar">
      {/* Left: page title */}
      <div>
        <h1 className="topbar-title">{title}</h1>
        {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>{subtitle}</p>}
      </div>

      {/* Right: actions */}
      <div className="topbar-actions">

        {/* Notification bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="topbar-icon-btn"
            title="Notifications"
            onClick={() => { setNotifOpen(o => !o); setMenuOpen(false); }}
          >
            <Bell size={18} />
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 16, height: 16, borderRadius: '50%',
                background: 'var(--danger)', color: '#fff',
                fontSize: '0.6rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1, border: '2px solid var(--surface)',
              }}>
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationPanel role={role} onClose={() => setNotifOpen(false)} />}
        </div>

        <div className="topbar-divider" />

        {/* User chip */}
        <div style={{ position: 'relative' }}>
          <button className="topbar-user" onClick={() => { setMenuOpen(o => !o); setNotifOpen(false); }}>
            <div className="topbar-user-avatar">{getInitials(user?.name)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span className="topbar-user-name">{user?.name}</span>
              <span className="topbar-user-role" style={{ textTransform: 'capitalize' }}>
                {user?.role?.replace(/_/g, ' ')}
              </span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)', marginLeft: '2px' }} />
          </button>

          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setMenuOpen(false)} />
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                minWidth: '180px', zIndex: 20, overflow: 'hidden',
                animation: 'slideUp 0.15s ease',
              }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{user?.email}</div>
                </div>
                <div style={{ padding: '6px' }}>
                  <button
                    onClick={handleLogout}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--danger)', fontWeight: 500, transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
