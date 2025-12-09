'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, getMe, signOut, OperatorSession } from '@/lib/admin/client';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [operator, setOperator] = useState<OperatorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      // Skip auth check for login page (redirect to unified login)
      if (pathname === '/admin/login') {
        window.location.href = '/login';
        return;
      }

      // Check if user is authenticated with Supabase
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        window.location.href = '/login';
        return;
      }

      // Verify user is an operator
      const { data, error } = await getMe();
      if (error || !data) {
        await signOut();
        window.location.href = '/login';
        return;
      }

      setOperator(data);
      setIsLoading(false);
    }

    checkAuth();
  }, [pathname]);

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Login page - no sidebar
  if (pathname === '/admin/login') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        {children}
      </div>
    );
  }

  // Admin dashboard with sidebar
  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/admin/salons', label: 'Salons', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  ];

  if (operator?.role === 'operator_admin') {
    navItems.push({ href: '/admin/audit-logs', label: 'Audit Logs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' });
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700">
        <div className="p-6">
          <h1 className="text-xl font-bold text-orange-500">SalonTalk Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Operator Console</p>
        </div>

        <nav className="px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                pathname === item.href
                  ? 'bg-orange-500/10 text-orange-500'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 w-64">
          <div className="text-sm text-gray-400 mb-2">
            {operator?.name} ({operator?.role})
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
