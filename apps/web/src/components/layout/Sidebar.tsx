'use client';

/**
 * Sidebar Component
 * サイドバーコンポーネント
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Mic,
  Users,
  Trophy,
  GraduationCap,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { name: 'セッション', href: '/dashboard/sessions', icon: Mic },
  { name: 'スタッフ', href: '/dashboard/staff', icon: Users },
  { name: '成功事例', href: '/dashboard/success-cases', icon: Trophy },
  { name: 'トレーニング', href: '/dashboard/training', icon: GraduationCap },
  { name: '分析', href: '/dashboard/analytics', icon: BarChart3 },
  { name: '設定', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
  user?: {
    name: string;
    salonName: string;
    role: string;
  };
  onLogout?: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-xl font-bold text-indigo-600">SalonTalk AI</h1>
            <p className="text-sm text-gray-500">管理ダッシュボード</p>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <span className="text-2xl font-bold text-indigo-600">S</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className={`w-5 h-5 ${collapsed ? '' : 'mr-3'}`} />
                  {!collapsed && item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        {user ? (
          <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-600 font-medium">
                {user.name.charAt(0)}
              </span>
            </div>
            {!collapsed && (
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.salonName}</p>
              </div>
            )}
            {!collapsed && onLogout && (
              <button
                onClick={onLogout}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="ログアウト"
              >
                <LogOut className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        ) : (
          <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
            {!collapsed && (
              <div className="ml-3">
                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse mt-1" />
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
