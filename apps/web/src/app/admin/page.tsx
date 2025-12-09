'use client';

import { useEffect, useState } from 'react';
import { getDashboardStats, DashboardStats } from '@/lib/admin/client';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const { data } = await getDashboardStats();
      if (data) setStats(data);
      setIsLoading(false);
    }
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Salons', value: stats?.total_salons ?? 0, color: 'bg-blue-500' },
    { label: 'Active Salons', value: stats?.active_salons ?? 0, color: 'bg-green-500' },
    { label: 'Suspended', value: stats?.suspended_salons ?? 0, color: 'bg-red-500' },
    { label: 'Total Staff', value: stats?.total_staff ?? 0, color: 'bg-purple-500' },
    { label: 'Active Devices', value: `${stats?.active_devices ?? 0}/${stats?.total_devices ?? 0}`, color: 'bg-cyan-500' },
    { label: 'Sessions Today', value: stats?.sessions_today ?? 0, color: 'bg-yellow-500' },
    { label: 'New Today', value: stats?.new_salons_today ?? 0, color: 'bg-pink-500' },
  ];

  const planStats = [
    { label: 'Free', value: stats?.plan_free ?? 0, color: 'bg-gray-500' },
    { label: 'Standard', value: stats?.plan_standard ?? 0, color: 'bg-blue-500' },
    { label: 'Premium', value: stats?.plan_premium ?? 0, color: 'bg-purple-500' },
    { label: 'Enterprise', value: stats?.plan_enterprise ?? 0, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center mb-4`}>
              <span className="text-white text-xl font-bold">
                {typeof stat.value === 'number' ? stat.value : stat.value.split('/')[0]}
              </span>
            </div>
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-white text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Plan Distribution</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {planStats.map((plan) => (
          <div key={plan.label} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">{plan.label}</span>
              <span className={`w-3 h-3 rounded-full ${plan.color}`}></span>
            </div>
            <p className="text-white text-3xl font-bold mt-2">{plan.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
