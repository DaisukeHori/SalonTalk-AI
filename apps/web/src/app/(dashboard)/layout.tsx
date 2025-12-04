'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: '📊' },
  { name: 'セッション', href: '/dashboard/sessions', icon: '🎙️' },
  { name: 'スタッフ', href: '/dashboard/staff', icon: '👥' },
  { name: '成功事例', href: '/dashboard/success-cases', icon: '🏆' },
  { name: 'トレーニング', href: '/dashboard/training', icon: '📚' },
  { name: '設定', href: '/dashboard/settings', icon: '⚙️' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-600">SalonTalk AI</h1>
          <p className="text-sm text-gray-500">管理ダッシュボード</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-lg">👤</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-800">店長 田中</p>
              <p className="text-xs text-gray-500">テストサロン</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
