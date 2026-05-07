'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { NAV_LINKS } from '@/lib/constants';
import {
  LayoutDashboard, Factory, Users, BookOpen, Megaphone,
  ChevronRight, Package, ClipboardCheck, UserCheck, Calendar,
  FileText, Receipt, BarChart3, Target, UserPlus, LogOut,
} from 'lucide-react';

const ICON_MAP = {
  '/dashboard':            LayoutDashboard,
  '/manufacturing':        Factory,
  '/manufacturing/orders': Package,
  '/manufacturing/inventory': Package,
  '/manufacturing/quality': ClipboardCheck,
  '/hr':                   Users,
  '/hr/employees':         UserCheck,
  '/hr/attendance':        Calendar,
  '/hr/leave':             Calendar,
  '/hr/payroll':           FileText,
  '/accounting':           BookOpen,
  '/accounting/invoices':  Receipt,
  '/accounting/bills':     Receipt,
  '/accounting/reports':   BarChart3,
  '/marketing':            Megaphone,
  '/marketing/campaigns':  Target,
  '/marketing/leads':      UserPlus,
};

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState(() => {
    // Pre-open the section that matches the current path
    const initial = {};
    NAV_LINKS.forEach(link => {
      if (link.children && pathname.startsWith(link.href)) {
        initial[link.href] = true;
      }
    });
    return initial;
  });

  const visibleLinks = NAV_LINKS.filter(link => link.roles.includes(user?.role));

  function toggle(href) {
    setOpenSections(prev => ({ ...prev, [href]: !prev[href] }));
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo-area">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <div>
            <div className="sidebar-logo-name">Nexora</div>
            <div className="sidebar-logo-tag">Smart ERP Solution</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main Menu</div>

        {visibleLinks.map(link => {
          const Icon = ICON_MAP[link.href] || LayoutDashboard;
          const isActive = pathname.startsWith(link.href);
          const isOpen = openSections[link.href];

          if (!link.children) {
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="nav-icon" size={16} />
                {link.label}
              </Link>
            );
          }

          return (
            <div key={link.href}>
              <button
                onClick={() => toggle(link.href)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="nav-icon" size={16} />
                <span style={{ flex: 1, textAlign: 'left' }}>{link.label}</span>
                <ChevronRight
                  className={`nav-chevron ${isOpen ? 'open' : ''}`}
                  size={14}
                />
              </button>

              {isOpen && (
                <div className="nav-children">
                  {link.children.filter(child => !child.roles || child.roles.includes(user?.role)).map(child => {
                    const ChildIcon = ICON_MAP[child.href];
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`nav-child ${pathname === child.href ? 'active' : ''}`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer — user info */}
      <div className="sidebar-footer">
        <div className="sidebar-avatar">
          {getInitials(user?.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-user-name truncate">{user?.name}</div>
          <div className="sidebar-user-role truncate" style={{ textTransform: 'capitalize' }}>
            {user?.role?.replace(/_/g, ' ')}
          </div>
        </div>
        <button
          onClick={() => { logout(); window.location.href = '/login'; }}
          title="Logout"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
