'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getSalon,
  updateSalonSeats,
  updateSalonPlan,
  suspendSalon,
  unsuspendSalon,
  SalonWithStats,
  getMe,
  OperatorSession,
  getSalonUsageStats,
  SalonUsageStats,
  createStaff,
  deleteStaff,
  createDevice,
  deleteDevice,
  updateSalonExpiry,
} from '@/lib/admin/client';

// Simple bar chart component
const UsageChart = ({ data, title }: { data: number[]; title: string }) => {
  const max = Math.max(...data, 1);
  const labels = ['月', '火', '水', '木', '金', '土', '日'];

  return (
    <div className="bg-gray-700/50 rounded-lg p-4">
      <p className="text-gray-400 text-sm mb-4">{title}</p>
      <div className="flex items-end gap-2 h-32">
        {data.map((value, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-gray-600 rounded-t relative" style={{ height: '100%' }}>
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t transition-all"
                style={{ height: `${(value / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{labels[index]}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-500">0</span>
        <span className="text-xs text-gray-500">{max}</span>
      </div>
    </div>
  );
};

export default function SalonDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [salon, setSalon] = useState<SalonWithStats | null>(null);
  const [operator, setOperator] = useState<OperatorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'devices' | 'usage'>('overview');

  // Modal states
  const [showSeatsModal, setShowSeatsModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);

  // Form states
  const [newSeats, setNewSeats] = useState(0);
  const [seatsReason, setSeatsReason] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [planReason, setPlanReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendNote, setSuspendNote] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New staff form
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'stylist' });

  // New device form
  const [newDevice, setNewDevice] = useState({ device_name: '', seat_number: '' });

  // Usage stats (loaded from API)
  const [usageStats, setUsageStats] = useState<SalonUsageStats | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [salonRes, meRes] = await Promise.all([getSalon(id), getMe()]);
      if (salonRes.data) {
        setSalon(salonRes.data);
        setNewSeats(salonRes.data.seats_count);
        setNewPlan(salonRes.data.plan);
      }
      if (meRes.data) setOperator(meRes.data);
      setIsLoading(false);
    }
    loadData();
  }, [id]);

  // Load usage stats when usage tab is selected
  useEffect(() => {
    if (activeTab === 'usage' && !usageStats && !isLoadingUsage) {
      setIsLoadingUsage(true);
      getSalonUsageStats(id).then(({ data }) => {
        if (data) setUsageStats(data);
        setIsLoadingUsage(false);
      });
    }
  }, [activeTab, id, usageStats, isLoadingUsage]);

  const handleUpdateSeats = async () => {
    setIsSubmitting(true);
    setError('');
    const { data, error: apiError } = await updateSalonSeats(id, newSeats, seatsReason);
    if (apiError) {
      setError(apiError.message);
    } else if (data?.success) {
      setSuccessMessage('座席数を更新しました');
      setShowSeatsModal(false);
      const { data: updated } = await getSalon(id);
      if (updated) setSalon(updated);
    }
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleUpdatePlan = async () => {
    setIsSubmitting(true);
    setError('');
    const { data, error: apiError } = await updateSalonPlan(id, newPlan, planReason);
    if (apiError) {
      setError(apiError.message);
    } else if (data?.success) {
      setSuccessMessage('プランを更新しました');
      setShowPlanModal(false);
      const { data: updated } = await getSalon(id);
      if (updated) setSalon(updated);
    }
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSuspend = async () => {
    setIsSubmitting(true);
    setError('');
    const { data, error: apiError } = await suspendSalon(id, suspendReason, suspendNote);
    if (apiError) {
      setError(apiError.message);
    } else if (data?.success) {
      setSuccessMessage('サロンを停止しました');
      setShowSuspendModal(false);
      const { data: updated } = await getSalon(id);
      if (updated) setSalon(updated);
    }
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleUnsuspend = async () => {
    setIsSubmitting(true);
    setError('');
    const { data, error: apiError } = await unsuspendSalon(id);
    if (apiError) {
      setError(apiError.message);
    } else if (data?.success) {
      setSuccessMessage('サロンを再開しました');
      const { data: updated } = await getSalon(id);
      if (updated) setSalon(updated);
    }
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSetExpiry = async () => {
    setIsSubmitting(true);
    setError('');
    const { data, error: apiError } = await updateSalonExpiry(
      id,
      expiryDate || null,
      '有効期限の設定'
    );
    if (apiError) {
      setError(apiError.message);
    } else if (data?.success) {
      setSuccessMessage(expiryDate ? `有効期限を ${expiryDate} に設定しました` : '有効期限を無期限に設定しました');
      setShowExpiryModal(false);
      const { data: updated } = await getSalon(id);
      if (updated) setSalon(updated);
    }
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleAddStaff = async () => {
    setIsSubmitting(true);
    setError('');
    const { data, error: apiError } = await createStaff(id, {
      name: newStaff.name,
      email: newStaff.email,
      role: newStaff.role,
    });
    if (apiError) {
      setError(apiError.message);
    } else if (data?.staff_id) {
      setSuccessMessage(`スタッフ ${newStaff.name} を追加しました`);
      setShowAddStaffModal(false);
      setNewStaff({ name: '', email: '', role: 'stylist' });
      const { data: updated } = await getSalon(id);
      if (updated) setSalon(updated);
    }
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!confirm(`スタッフ「${staffName}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    setIsSubmitting(true);
    setError('');
    const { data, error: apiError } = await deleteStaff(id, staffId);
    if (apiError) {
      setError(apiError.message);
    } else if (data?.success) {
      setSuccessMessage(`スタッフ ${staffName} を削除しました`);
      const { data: updated } = await getSalon(id);
      if (updated) setSalon(updated);
    }
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleAddDevice = async () => {
    setIsSubmitting(true);
    setError('');
    const { data, error: apiError } = await createDevice(id, {
      device_name: newDevice.device_name,
      seat_number: newDevice.seat_number ? parseInt(newDevice.seat_number) : undefined,
    });
    if (apiError) {
      setError(apiError.message);
    } else if (data?.device_id) {
      setSuccessMessage(`デバイス ${newDevice.device_name} を追加しました（アクティベーションコード: ${data.activation_code}）`);
      setShowAddDeviceModal(false);
      setNewDevice({ device_name: '', seat_number: '' });
      const { data: updated } = await getSalon(id);
      if (updated) setSalon(updated);
    }
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
    if (!confirm(`デバイス「${deviceName}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    setIsSubmitting(true);
    setError('');
    const { data, error: apiError } = await deleteDevice(id, deviceId);
    if (apiError) {
      setError(apiError.message);
    } else if (data?.success) {
      setSuccessMessage(`デバイス ${deviceName} を削除しました`);
      const { data: updated } = await getSalon(id);
      if (updated) setSalon(updated);
    }
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-400 text-lg">サロンが見つかりません</p>
        <Link href="/admin/salons" className="text-orange-500 hover:text-orange-400 mt-4 inline-block">
          ← サロン一覧に戻る
        </Link>
      </div>
    );
  }

  const isAdmin = operator?.role === 'operator_admin';

  const getPlanLabel = (planType: string) => {
    const labels: Record<string, string> = {
      free: 'フリー',
      standard: 'スタンダード',
      premium: 'プレミアム',
      enterprise: 'エンタープライズ',
    };
    return labels[planType] || planType;
  };

  const getPlanBadge = (planType: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      standard: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      premium: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      enterprise: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return colors[planType] || colors.free;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      stylist: 'スタイリスト',
      manager: 'マネージャー',
      owner: 'オーナー',
      admin: '管理者',
    };
    return labels[role] || role;
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/salons" className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{salon.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                salon.status === 'active'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {salon.status === 'active' ? 'アクティブ' : '停止中'}
              </span>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm font-mono mt-1 break-all">{salon.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-auto sm:ml-0">
          {isAdmin && salon.status === 'active' && (
            <button
              onClick={() => setShowSuspendModal(true)}
              className="px-3 sm:px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/30 text-sm"
            >
              サロンを停止
            </button>
          )}
          {isAdmin && salon.status === 'suspended' && (
            <button
              onClick={handleUnsuspend}
              disabled={isSubmitting}
              className="px-3 sm:px-4 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors border border-green-500/30 disabled:opacity-50 text-sm"
            >
              {isSubmitting ? '処理中...' : 'サロンを再開'}
            </button>
          )}
        </div>
      </div>

      {/* メッセージ */}
      {error && (
        <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-lg border border-red-500/20 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-500/10 text-green-400 px-4 py-3 rounded-lg border border-green-500/20 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="flex flex-wrap gap-1 bg-gray-800 p-1 rounded-xl">
        {[
          { id: 'overview', label: '概要', shortLabel: '概要', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { id: 'staff', label: `スタッフ (${salon.staffs.length})`, shortLabel: `Staff (${salon.staffs.length})`, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
          { id: 'devices', label: `デバイス (${salon.devices.length})`, shortLabel: `iPad (${salon.devices.length})`, icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' },
          { id: 'usage', label: '利用状況', shortLabel: '利用', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 min-w-[70px] flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-xs sm:text-sm ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* 概要タブ */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* サロン情報カード */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              サロン情報
            </h2>
            <dl className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <dt className="text-gray-400 text-sm">プラン</dt>
                <dd className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded text-xs font-medium border ${getPlanBadge(salon.plan)}`}>
                    {getPlanLabel(salon.plan)}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => setShowPlanModal(true)}
                      className="text-orange-500 text-sm hover:text-orange-400"
                    >
                      変更
                    </button>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <dt className="text-gray-400 text-sm">座席数（iPad数）</dt>
                <dd className="flex items-center gap-2">
                  <span className="text-white font-medium">{salon.seats_count} 席</span>
                  <button
                    onClick={() => setShowSeatsModal(true)}
                    className="text-orange-500 text-sm hover:text-orange-400"
                  >
                    変更
                  </button>
                </dd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <dt className="text-gray-400 text-sm">有効期限</dt>
                <dd className="flex items-center gap-2">
                  <span className="text-white font-medium">無期限</span>
                  {isAdmin && (
                    <button
                      onClick={() => setShowExpiryModal(true)}
                      className="text-orange-500 text-sm hover:text-orange-400"
                    >
                      設定
                    </button>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <dt className="text-gray-400 text-sm">作成日</dt>
                <dd className="text-white">{new Date(salon.created_at).toLocaleDateString('ja-JP')}</dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-gray-400 text-sm">更新日</dt>
                <dd className="text-white">{new Date(salon.updated_at).toLocaleDateString('ja-JP')}</dd>
              </div>
            </dl>

            {salon.suspended_at && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm font-medium">停止中</p>
                <p className="text-red-300 text-xs mt-1">
                  停止日: {new Date(salon.suspended_at).toLocaleDateString('ja-JP')}
                </p>
                {salon.suspended_reason && (
                  <p className="text-gray-400 text-xs mt-2">理由: {salon.suspended_reason}</p>
                )}
              </div>
            )}
          </div>

          {/* 統計カード */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              統計情報
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-3xl font-bold text-white">{salon.stats.staff_count}</p>
                <p className="text-gray-400 text-sm">スタッフ数</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-3xl font-bold text-white">{salon.stats.active_device_count}</p>
                <p className="text-gray-400 text-sm">アクティブデバイス</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-3xl font-bold text-white">{salon.stats.total_sessions}</p>
                <p className="text-gray-400 text-sm">総セッション</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-3xl font-bold text-white">{salon.stats.sessions_this_month}</p>
                <p className="text-gray-400 text-sm">今月のセッション</p>
              </div>
            </div>
            {salon.stats.last_session_at && (
              <p className="text-gray-400 text-sm mt-4 pt-4 border-t border-gray-700">
                最終セッション: {new Date(salon.stats.last_session_at).toLocaleString('ja-JP')}
              </p>
            )}
          </div>

          {/* 内部メモ */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              内部メモ
            </h2>
            <div className="bg-gray-700/50 rounded-lg p-4 min-h-[100px]">
              {salon.internal_note ? (
                <p className="text-gray-300 whitespace-pre-wrap">{salon.internal_note}</p>
              ) : (
                <p className="text-gray-500">メモはありません</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* スタッフタブ */}
      {activeTab === 'staff' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">スタッフ一覧</h2>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              スタッフを追加
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">名前</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">メール</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">役割</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">登録日</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {salon.staffs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      スタッフはまだ登録されていません
                    </td>
                  </tr>
                ) : (
                  salon.staffs.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-white font-medium">{staff.name}</td>
                      <td className="px-6 py-4 text-gray-400">{staff.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                          {getRoleLabel(staff.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          staff.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {staff.is_active ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {new Date(staff.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDeleteStaff(staff.id, staff.name)}
                            disabled={isSubmitting}
                            className="text-red-400 text-sm hover:text-red-300 disabled:opacity-50"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* デバイスタブ */}
      {activeTab === 'devices' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">デバイス一覧</h2>
              <p className="text-gray-400 text-sm">
                {salon.stats.active_device_count} / {salon.seats_count} 台がアクティブ
              </p>
            </div>
            <button
              onClick={() => setShowAddDeviceModal(true)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              デバイスを追加
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">デバイス名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">座席番号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">最終アクティブ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {salon.devices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      デバイスはまだ登録されていません
                    </td>
                  </tr>
                ) : (
                  salon.devices.map((device) => (
                    <tr key={device.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-white font-medium">{device.device_name}</td>
                      <td className="px-6 py-4 text-gray-400">{device.seat_number ?? '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          device.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {device.status === 'active' ? 'アクティブ' : '非アクティブ'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {device.last_active_at
                          ? new Date(device.last_active_at).toLocaleString('ja-JP')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDeleteDevice(device.id, device.device_name)}
                            disabled={isSubmitting}
                            className="text-red-400 text-sm hover:text-red-300 disabled:opacity-50"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 利用状況タブ */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          {/* 詳細分析ページへのリンク */}
          <div className="bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-xl p-6 border border-orange-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">詳細利用分析</h3>
                <p className="text-gray-400 text-sm mt-1">
                  文字起こし時間、文字数、スタッフ別・デバイス別統計、時間帯別利用推移など
                </p>
              </div>
              <Link
                href={`/admin/salons/${id}/analytics`}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                詳細分析を見る
              </Link>
            </div>
          </div>

          {isLoadingUsage ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : usageStats ? (
            <>
              {/* 利用統計カード */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-5 border border-blue-500/30">
                  <p className="text-gray-400 text-sm mb-2">今月のセッション</p>
                  <p className="text-3xl font-bold text-white">{usageStats.sessions_this_month}</p>
                  {usageStats.sessions_last_month > 0 && (
                    <p className={`text-xs mt-1 ${
                      usageStats.sessions_this_month >= usageStats.sessions_last_month ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {usageStats.sessions_this_month >= usageStats.sessions_last_month ? '+' : ''}
                      {Math.round(((usageStats.sessions_this_month - usageStats.sessions_last_month) / usageStats.sessions_last_month) * 100)}% 先月比
                    </p>
                  )}
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-5 border border-green-500/30">
                  <p className="text-gray-400 text-sm mb-2">平均セッション時間</p>
                  <p className="text-3xl font-bold text-white">{Math.round(usageStats.avg_session_duration_min)}分</p>
                  {usageStats.avg_session_duration_last_month_min > 0 && (
                    <p className={`text-xs mt-1 ${
                      usageStats.avg_session_duration_min >= usageStats.avg_session_duration_last_month_min ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {usageStats.avg_session_duration_min >= usageStats.avg_session_duration_last_month_min ? '+' : ''}
                      {Math.round(usageStats.avg_session_duration_min - usageStats.avg_session_duration_last_month_min)}分 先月比
                    </p>
                  )}
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-5 border border-purple-500/30">
                  <p className="text-gray-400 text-sm mb-2">平均トークスコア</p>
                  <p className="text-3xl font-bold text-white">{Math.round(usageStats.avg_talk_score)}点</p>
                  {usageStats.avg_talk_score_last_month > 0 && (
                    <p className={`text-xs mt-1 ${
                      usageStats.avg_talk_score >= usageStats.avg_talk_score_last_month ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {usageStats.avg_talk_score >= usageStats.avg_talk_score_last_month ? '+' : ''}
                      {Math.round(usageStats.avg_talk_score - usageStats.avg_talk_score_last_month)}点 先月比
                    </p>
                  )}
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl p-5 border border-orange-500/30">
                  <p className="text-gray-400 text-sm mb-2">店販成約率</p>
                  <p className="text-3xl font-bold text-white">{Math.round(usageStats.conversion_rate)}%</p>
                  {usageStats.conversion_rate_last_month > 0 && (
                    <p className={`text-xs mt-1 ${
                      usageStats.conversion_rate >= usageStats.conversion_rate_last_month ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {usageStats.conversion_rate >= usageStats.conversion_rate_last_month ? '+' : ''}
                      {Math.round(usageStats.conversion_rate - usageStats.conversion_rate_last_month)}% 先月比
                    </p>
                  )}
                </div>
              </div>

              {/* グラフ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">週間セッション数</h3>
                  <UsageChart data={usageStats.weekly_sessions} title="過去7日間" />
                </div>
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">週間成約数</h3>
                  <UsageChart data={usageStats.weekly_conversions} title="過去7日間" />
                </div>
              </div>

              {/* 詳細テーブル */}
              <div className="bg-gray-800 rounded-xl border border-gray-700">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-white">月別利用履歴</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">月</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">セッション数</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">平均スコア</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">成約数</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">成約率</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {usageStats.monthly_history.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                            利用履歴がありません
                          </td>
                        </tr>
                      ) : (
                        usageStats.monthly_history.map((row) => (
                          <tr key={row.month} className="hover:bg-gray-700/50">
                            <td className="px-6 py-4 text-white">{row.month}</td>
                            <td className="px-6 py-4 text-gray-300">{row.sessions}</td>
                            <td className="px-6 py-4 text-gray-300">{Math.round(row.avg_score)}点</td>
                            <td className="px-6 py-4 text-gray-300">{row.conversions}</td>
                            <td className="px-6 py-4 text-green-400">{row.conversion_rate}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>利用統計を読み込めませんでした</p>
            </div>
          )}
        </div>
      )}

      {/* 座席数変更モーダル */}
      {showSeatsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">座席数（iPad数）を変更</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">新しい座席数</label>
                <input
                  type="number"
                  value={newSeats}
                  onChange={(e) => setNewSeats(parseInt(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">変更理由（10文字以上）</label>
                <textarea
                  value={seatsReason}
                  onChange={(e) => setSeatsReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="変更理由を入力してください..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowSeatsModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateSeats}
                disabled={isSubmitting || seatsReason.length < 10}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プラン変更モーダル */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">プランを変更</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">新しいプラン</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="free">フリー</option>
                  <option value="standard">スタンダード</option>
                  <option value="premium">プレミアム</option>
                  <option value="enterprise">エンタープライズ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">変更理由</label>
                <textarea
                  value={planReason}
                  onChange={(e) => setPlanReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="変更理由を入力してください..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdatePlan}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 有効期限設定モーダル */}
      {showExpiryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">有効期限を設定</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">有効期限</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <p className="text-gray-500 text-sm">
                有効期限を過ぎると、サロンは自動的に停止されます。空白にすると無期限になります。
              </p>
            </div>
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowExpiryModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleSetExpiry}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                設定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* サロン停止モーダル */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">サロンを停止</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">
                  サロンを停止すると、すべてのスタッフがログインできなくなります。
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">停止理由（ユーザーに表示されます）</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="停止理由を入力してください..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">内部メモ（任意）</label>
                <textarea
                  value={suspendNote}
                  onChange={(e) => setSuspendNote(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="オペレーター向けのメモ..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleSuspend}
                disabled={isSubmitting || !suspendReason}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isSubmitting ? '処理中...' : '停止する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* スタッフ追加モーダル */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">スタッフを追加</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">名前</label>
                <input
                  type="text"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="例: 山田 太郎"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">メールアドレス</label>
                <input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="例: staff@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">役割</label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="stylist">スタイリスト</option>
                  <option value="manager">マネージャー</option>
                  <option value="owner">オーナー</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddStaff}
                disabled={!newStaff.name || !newStaff.email}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* デバイス追加モーダル */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">デバイスを追加</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">デバイス名</label>
                <input
                  type="text"
                  value={newDevice.device_name}
                  onChange={(e) => setNewDevice({ ...newDevice, device_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="例: iPad 1号機"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">座席番号（任意）</label>
                <input
                  type="number"
                  value={newDevice.seat_number}
                  onChange={(e) => setNewDevice({ ...newDevice, seat_number: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="例: 1"
                  min={1}
                />
              </div>
              <p className="text-gray-500 text-sm">
                デバイスは登録後、iPadアプリからアクティベーションする必要があります。
              </p>
            </div>
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowAddDeviceModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddDevice}
                disabled={!newDevice.device_name}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
