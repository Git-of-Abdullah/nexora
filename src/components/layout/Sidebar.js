'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { NAV_LINKS } from '@/lib/constants';

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [openSection, setOpenSection] = useState(null);

  const visibleLinks = NAV_LINKS.filter((link) =>
    link.roles.includes(user?.role)
  );

  return (
    <aside className="w-64 min-h-screen flex flex-col" style={{ backgroundColor: 'var(--primary)' }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <h1 className="text-white text-xl font-bold tracking-wide">Nexora</h1>
        <p className="text-white/50 text-xs mt-0.5">Smart ERP Solution</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleLinks.map((link) => {
          const isActive = pathname.startsWith(link.href);
          const isOpen = openSection === link.href;

          if (!link.children) {
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          }

          return (
            <div key={link.href}>
              <button
                onClick={() => setOpenSection(isOpen ? null : link.href)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
                <span className={`transition-transform text-xs ${isOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {(isOpen || isActive) && (
                <div className="mt-1 ml-3 space-y-1">
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        pathname === child.href
                          ? 'bg-white/20 text-white'
                          : 'text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-white text-sm font-medium truncate">{user?.name}</p>
        <p className="text-white/50 text-xs capitalize">{user?.role?.replace(/_/g, ' ')}</p>
      </div>
    </aside>
  );
}
