'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="h-14 px-6 flex items-center justify-between border-b bg-white border-gray-200">
      <h2 className="text-gray-800 font-semibold text-base">{title}</h2>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
