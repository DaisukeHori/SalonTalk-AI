'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getSalon,
  getSalonAnalytics,
  SalonWithStats,
  SalonAnalytics,
} from '@/lib/admin/client';

export default function SalonAnalyticsPage() {
  const params = useParams();
  const salonId = params.id as string;

  const [salon, setSalon] = useState<SalonWithStats | null>(null);
  const [analytics, setAnalytics] = useState<SalonAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [salonRes, analyticsRes] = await Promise.all([
        getSalon(salonId),
        getSalonAnalytics(salonId, period),
      ]);

      if (salonRes.data) {
        setSalon(salonRes.data);
      }
      if (analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }
      setIsLoading(false);
    }

    loadData();
  }, [salonId, period]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ja-JP').format(num);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}分`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!salon || !analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">データが見つかりません</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
          <Link href="/admin" className="hover:text-white">ダッシュボード</Link>
          <span>/</span>
          <Link href="/admin/salons" className="hover:text-white">サロン一覧</Link>
          <span>/</span>
          <Link href={`/admin/salons/${salonId}`} className="hover:text-white">{salon.name}</Link>
          <span>/</span>
          <span className="text-white">利用分析</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{salon.name} - 利用分析</h1>
          <Link
            href={`/admin/salons/${salonId}`}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-center sm:text-left"
          >
            サロン詳細に戻る
          </Link>
        </div>
      </div>

      {/* Period Selector */}
      <div className="mb-6">
        <div className="inline-flex bg-gray-800 rounded-lg p-1 border border-gray-700">
          {[
            { value: 'week' as const, label: '週間' },
            { value: 'month' as const, label: '月間' },
            { value: 'all' as const, label: '全期間' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">総セッション数</div>
          <div className="text-3xl font-bold text-white">
            {formatNumber(analytics.summary.total_sessions)}
          </div>
          <div className="text-gray-500 text-xs mt-1">回</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">総文字起こし時間</div>
          <div className="text-3xl font-bold text-orange-500">
            {formatTime(analytics.summary.total_transcription_time_min)}
          </div>
          <div className="text-gray-500 text-xs mt-1">
            平均: {formatTime(analytics.summary.avg_session_duration_min)}/セッション
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">総文字数</div>
          <div className="text-3xl font-bold text-blue-500">
            {formatNumber(analytics.summary.total_character_count)}
          </div>
          <div className="text-gray-500 text-xs mt-1">
            平均: {formatNumber(analytics.summary.avg_characters_per_session)}文字/セッション
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">話者比率</div>
          <div className="text-xl font-bold text-white">
            <span className="text-purple-500">
              {analytics.summary.total_character_count > 0
                ? Math.round((analytics.summary.stylist_character_count / analytics.summary.total_character_count) * 100)
                : 0}%
            </span>
            <span className="text-gray-500 mx-1">:</span>
            <span className="text-green-500">
              {analytics.summary.total_character_count > 0
                ? Math.round((analytics.summary.customer_character_count / analytics.summary.total_character_count) * 100)
                : 0}%
            </span>
          </div>
          <div className="text-gray-500 text-xs mt-1">スタイリスト : お客様</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Trends */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">日別利用推移</h2>
          <div className="h-64 overflow-x-auto">
            <div className="flex items-end gap-1 h-48 min-w-[600px]">
              {analytics.daily_trends.map((day, i) => {
                const maxSessions = Math.max(...analytics.daily_trends.map(d => d.session_count), 1);
                const height = (day.session_count / maxSessions) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center"
                    title={`${day.date}: ${day.session_count}セッション, ${formatTime(day.total_duration_min)}`}
                  >
                    <div
                      className="w-full bg-orange-500/80 rounded-t hover:bg-orange-400 transition-colors cursor-pointer"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <div className="text-[10px] text-gray-500 mt-1 transform -rotate-45 origin-left whitespace-nowrap">
                      {day.date.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">日付（セッション数）</div>
        </div>

        {/* Hourly Usage */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">時間帯別利用状況</h2>
          <div className="h-64">
            <div className="flex items-end gap-1 h-48">
              {analytics.hourly_usage.map((hour) => {
                const maxSessions = Math.max(...analytics.hourly_usage.map(h => h.session_count), 1);
                const height = (hour.session_count / maxSessions) * 100;
                return (
                  <div
                    key={hour.hour}
                    className="flex-1 flex flex-col items-center"
                    title={`${hour.hour}時: ${hour.session_count}セッション, ${formatTime(hour.total_duration_min)}`}
                  >
                    <div
                      className="w-full bg-blue-500/80 rounded-t hover:bg-blue-400 transition-colors cursor-pointer"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <div className="text-[10px] text-gray-500 mt-1">
                      {hour.hour}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">時間帯（時）</div>
        </div>
      </div>

      {/* Staff Stats */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 mb-8">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">スタッフ別統計</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">スタッフ名</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">セッション数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">総時間</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">平均時間</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">総文字数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">平均文字数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {analytics.staff_stats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    データがありません
                  </td>
                </tr>
              ) : (
                analytics.staff_stats.map((staff) => (
                  <tr key={staff.staff_id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-white font-medium">{staff.staff_name}</td>
                    <td className="px-6 py-4 text-right text-white">{formatNumber(staff.session_count)}</td>
                    <td className="px-6 py-4 text-right text-orange-500">{formatTime(staff.total_duration_min)}</td>
                    <td className="px-6 py-4 text-right text-gray-400">{formatTime(staff.avg_duration_min)}</td>
                    <td className="px-6 py-4 text-right text-blue-500">{formatNumber(staff.total_characters)}</td>
                    <td className="px-6 py-4 text-right text-gray-400">{formatNumber(staff.avg_characters_per_session)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Stats */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">デバイス別統計</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">デバイス名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">席番号</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">セッション数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">総時間</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">最終利用</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {analytics.device_stats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    データがありません
                  </td>
                </tr>
              ) : (
                analytics.device_stats.map((device) => (
                  <tr key={device.device_id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-white font-medium">{device.device_name}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {device.seat_number !== null ? `席${device.seat_number}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-white">{formatNumber(device.session_count)}</td>
                    <td className="px-6 py-4 text-right text-orange-500">{formatTime(device.total_duration_min)}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {device.last_active_at
                        ? new Date(device.last_active_at).toLocaleString('ja-JP')
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-sm text-gray-500 text-right">
        期間: {new Date(analytics.from_date).toLocaleDateString('ja-JP')} 〜{' '}
        {new Date(analytics.to_date).toLocaleDateString('ja-JP')}
      </div>
    </div>
  );
}
