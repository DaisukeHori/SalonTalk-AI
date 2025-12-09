'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">ダッシュボード</h1>
          <p className="text-gray-400 mt-1">SalonTalk AI 運営状況の概要</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/salons?action=create"
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規サロン作成
          </Link>
        </div>
      </div>

      {/* メイン統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-6 border border-blue-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <Link href="/admin/salons" className="text-blue-400 text-sm hover:underline">
              一覧を見る →
            </Link>
          </div>
          <p className="text-4xl font-bold text-white">{stats?.total_salons ?? 0}</p>
          <p className="text-gray-400 mt-1">総サロン数</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-6 border border-green-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-green-400 text-sm">稼働中</span>
          </div>
          <p className="text-4xl font-bold text-white">{stats?.active_salons ?? 0}</p>
          <p className="text-gray-400 mt-1">アクティブサロン</p>
        </div>

        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl p-6 border border-red-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <Link href="/admin/salons?status=suspended" className="text-red-400 text-sm hover:underline">
              確認する →
            </Link>
          </div>
          <p className="text-4xl font-bold text-white">{stats?.suspended_salons ?? 0}</p>
          <p className="text-gray-400 mt-1">停止中サロン</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-6 border border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold text-white">{stats?.total_staff ?? 0}</p>
          <p className="text-gray-400 mt-1">総スタッフ数</p>
        </div>
      </div>

      {/* サブ統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-gray-400">デバイス状況</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-white">{stats?.active_devices ?? 0}</span>
            <span className="text-gray-500 mb-1">/ {stats?.total_devices ?? 0} 台</span>
          </div>
          <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all"
              style={{ width: `${stats?.total_devices ? (stats.active_devices / stats.total_devices) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-gray-400">本日のセッション</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats?.sessions_today ?? 0}</p>
          <p className="text-gray-500 text-sm mt-1">会話分析セッション</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <span className="text-gray-400">本日の新規登録</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats?.new_salons_today ?? 0}</p>
          <p className="text-gray-500 text-sm mt-1">新規サロン</p>
        </div>
      </div>

      {/* プラン分布 */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6">プラン別サロン分布</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">フリー</span>
              <span className="w-3 h-3 rounded-full bg-gray-500"></span>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.plan_free ?? 0}</p>
            <p className="text-gray-500 text-xs mt-1">無料プラン</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4 border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-400 text-sm">スタンダード</span>
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.plan_standard ?? 0}</p>
            <p className="text-gray-500 text-xs mt-1">月額基本プラン</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-400 text-sm">プレミアム</span>
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.plan_premium ?? 0}</p>
            <p className="text-gray-500 text-xs mt-1">高機能プラン</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4 border border-orange-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-400 text-sm">エンタープライズ</span>
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.plan_enterprise ?? 0}</p>
            <p className="text-gray-500 text-xs mt-1">大規模向け</p>
          </div>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6">クイックアクション</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/salons?action=create"
            className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors group"
          >
            <div className="p-3 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition-colors">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">新規サロン作成</p>
              <p className="text-gray-400 text-sm">新しいサロンを登録</p>
            </div>
          </Link>

          <Link
            href="/admin/salons"
            className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors group"
          >
            <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">サロン一覧</p>
              <p className="text-gray-400 text-sm">登録済みサロンを管理</p>
            </div>
          </Link>

          <Link
            href="/admin/audit-logs"
            className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors group"
          >
            <div className="p-3 bg-gray-500/20 rounded-lg group-hover:bg-gray-500/30 transition-colors">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">監査ログ</p>
              <p className="text-gray-400 text-sm">操作履歴を確認</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
