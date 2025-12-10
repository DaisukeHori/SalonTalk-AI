'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getSalon,
  getSalonAnalytics,
  getSalonSessions,
  getSalonSessionDetail,
  SalonWithStats,
  SalonAnalytics,
  SessionListItem,
  SessionDetailResponse,
  AnalyticsFilterParams,
} from '@/lib/admin/client';

export default function SalonAnalyticsPage() {
  const params = useParams();
  const salonId = params.id as string;

  const [salon, setSalon] = useState<SalonWithStats | null>(null);
  const [analytics, setAnalytics] = useState<SalonAnalytics | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionsPagination, setSessionsPagination] = useState({ page: 1, total: 0, total_pages: 0 });
  const [selectedSession, setSelectedSession] = useState<SessionDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'sessions'>('analytics');

  // Filter states
  const [period, setPeriod] = useState<'week' | 'month' | 'all' | 'custom'>('month');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Load salon info once
  useEffect(() => {
    async function loadSalon() {
      const salonRes = await getSalon(salonId);
      if (salonRes.data) {
        setSalon(salonRes.data);
      }
    }
    loadSalon();
  }, [salonId]);

  // Build filter params
  const buildFilterParams = useCallback((): AnalyticsFilterParams => {
    const filterParams: AnalyticsFilterParams = { period };
    if (period === 'custom' && customFromDate && customToDate) {
      filterParams.from_date = customFromDate;
      filterParams.to_date = customToDate;
    }
    if (selectedStaffId) {
      filterParams.staff_id = selectedStaffId;
    }
    if (selectedDeviceId) {
      filterParams.device_id = selectedDeviceId;
    }
    return filterParams;
  }, [period, customFromDate, customToDate, selectedStaffId, selectedDeviceId]);

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    const filterParams = buildFilterParams();
    const analyticsRes = await getSalonAnalytics(salonId, filterParams);
    if (analyticsRes.data) {
      setAnalytics(analyticsRes.data);
    }
    setIsLoading(false);
  }, [salonId, buildFilterParams]);

  // Load sessions
  const loadSessions = useCallback(async (page = 1) => {
    setIsLoadingSessions(true);
    const filterParams = buildFilterParams();
    const sessionsRes = await getSalonSessions(salonId, {
      page,
      limit: 20,
      from_date: filterParams.from_date,
      to_date: filterParams.to_date,
      staff_id: filterParams.staff_id,
      device_id: filterParams.device_id,
    });
    if (sessionsRes.data) {
      setSessions(sessionsRes.data.sessions);
      setSessionsPagination({
        page: sessionsRes.data.pagination.page,
        total: sessionsRes.data.pagination.total,
        total_pages: sessionsRes.data.pagination.total_pages,
      });
    }
    setIsLoadingSessions(false);
  }, [salonId, buildFilterParams]);

  // Load data on filter change
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (activeTab === 'sessions') {
      loadSessions();
    }
  }, [activeTab, loadSessions]);

  // Load session detail
  const openSessionDetail = async (sessionId: string) => {
    setIsLoadingDetail(true);
    setShowSessionModal(true);
    const detailRes = await getSalonSessionDetail(salonId, sessionId);
    if (detailRes.data) {
      setSelectedSession(detailRes.data);
    }
    setIsLoadingDetail(false);
  };

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

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    const minutes = Math.round(ms / 60000);
    return formatTime(minutes);
  };

  if (isLoading && !salon) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!salon) {
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

      {/* Filter Section */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Period Selector */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">期間</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
            >
              <option value="week">週間</option>
              <option value="month">月間</option>
              <option value="all">全期間</option>
              <option value="custom">カスタム</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {period === 'custom' && (
            <>
              <div>
                <label className="block text-gray-400 text-sm mb-1">開始日</label>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">終了日</label>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                />
              </div>
            </>
          )}

          {/* Staff Filter */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">スタッフ</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm min-w-[150px]"
            >
              <option value="">全スタッフ</option>
              {salon.staffs?.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
          </div>

          {/* Device Filter */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">デバイス</label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm min-w-[150px]"
            >
              <option value="">全デバイス</option>
              {salon.devices?.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.device_name} {device.seat_number ? `(席${device.seat_number})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(selectedStaffId || selectedDeviceId || period === 'custom') && (
            <button
              onClick={() => {
                setSelectedStaffId('');
                setSelectedDeviceId('');
                setPeriod('month');
                setCustomFromDate('');
                setCustomToDate('');
              }}
              className="px-4 py-2 text-orange-500 hover:text-orange-400 text-sm"
            >
              フィルターをクリア
            </button>
          )}
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'bg-gray-800 text-white border-t border-l border-r border-gray-700'
              : 'bg-gray-700/50 text-gray-400 hover:text-white'
          }`}
        >
          分析サマリー
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
            activeTab === 'sessions'
              ? 'bg-gray-800 text-white border-t border-l border-r border-gray-700'
              : 'bg-gray-700/50 text-gray-400 hover:text-white'
          }`}
        >
          セッション一覧
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      ) : activeTab === 'analytics' && analytics ? (
        <>
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
        </>
      ) : activeTab === 'sessions' ? (
        /* Sessions Tab */
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">
              セッション一覧
              <span className="text-gray-400 text-sm font-normal ml-2">({sessionsPagination.total}件)</span>
            </h2>
          </div>

          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">日時</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">スタッフ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">デバイス</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">時間</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">スコア</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">アクション</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                          セッションがありません
                        </td>
                      </tr>
                    ) : (
                      sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 text-white">
                            {new Date(session.started_at).toLocaleString('ja-JP')}
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            {session.staffs?.name || '-'}
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            {session.devices?.device_name || '-'}
                            {session.devices?.seat_number && ` (席${session.devices.seat_number})`}
                          </td>
                          <td className="px-6 py-4 text-right text-orange-500">
                            {formatDuration(session.total_duration_ms)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {session.session_reports?.overall_score != null ? (
                              <span className={`font-medium ${
                                (session.session_reports?.overall_score ?? 0) >= 70 ? 'text-green-500' :
                                (session.session_reports?.overall_score ?? 0) >= 50 ? 'text-yellow-500' : 'text-red-500'
                              }`}>
                                {session.session_reports?.overall_score}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => openSessionDetail(session.id)}
                              className="text-orange-500 hover:text-orange-400 text-sm"
                            >
                              詳細を見る
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {sessionsPagination.total_pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-700 flex justify-center gap-2">
                  <button
                    onClick={() => loadSessions(sessionsPagination.page - 1)}
                    disabled={sessionsPagination.page <= 1}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    前へ
                  </button>
                  <span className="px-4 py-2 text-gray-400">
                    {sessionsPagination.page} / {sessionsPagination.total_pages}
                  </span>
                  <button
                    onClick={() => loadSessions(sessionsPagination.page + 1)}
                    disabled={sessionsPagination.page >= sessionsPagination.total_pages}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    次へ
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      {/* Session Detail Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">セッション詳細</h3>
              <button
                onClick={() => {
                  setShowSessionModal(false);
                  setSelectedSession(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                </div>
              ) : selectedSession ? (
                <div className="space-y-6">
                  {/* Session Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">日時</div>
                      <div className="text-white font-medium">
                        {new Date(selectedSession.session.started_at).toLocaleString('ja-JP')}
                      </div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">スタッフ</div>
                      <div className="text-white font-medium">
                        {selectedSession.session.staffs?.name || '-'}
                      </div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">時間</div>
                      <div className="text-orange-500 font-medium">
                        {formatDuration(selectedSession.session.total_duration_ms)}
                      </div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">スコア</div>
                      <div className="text-white font-medium">
                        {selectedSession.session.session_reports?.overall_score ?? '-'}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  {selectedSession.session.session_reports?.summary && (
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">要約</h4>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">
                        {selectedSession.session.session_reports.summary}
                      </p>
                    </div>
                  )}

                  {/* Talk Ratio */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">話者比率</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-gray-600 rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full bg-purple-500"
                          style={{ width: `${selectedSession.transcription.stats.talk_ratio.stylist}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-400">
                        <span className="text-purple-400">{selectedSession.transcription.stats.talk_ratio.stylist}%</span>
                        {' : '}
                        <span className="text-green-400">{selectedSession.transcription.stats.talk_ratio.customer}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>スタイリスト</span>
                      <span>お客様</span>
                    </div>
                  </div>

                  {/* Transcription */}
                  <div>
                    <h4 className="text-white font-medium mb-3">
                      文字起こし
                      <span className="text-gray-400 text-sm font-normal ml-2">
                        ({selectedSession.transcription.stats.total_segments}セグメント, {formatNumber(selectedSession.transcription.stats.total_characters)}文字)
                      </span>
                    </h4>
                    <div className="bg-gray-700/50 rounded-lg p-4 max-h-[400px] overflow-y-auto space-y-3">
                      {selectedSession.transcription.segments.length === 0 ? (
                        <p className="text-gray-400 text-center">文字起こしデータがありません</p>
                      ) : (
                        selectedSession.transcription.segments.map((segment) => (
                          <div
                            key={segment.id}
                            className={`p-3 rounded-lg ${
                              segment.speaker === 'stylist'
                                ? 'bg-purple-500/10 border-l-4 border-purple-500'
                                : segment.speaker === 'customer'
                                ? 'bg-green-500/10 border-l-4 border-green-500'
                                : 'bg-gray-600/50 border-l-4 border-gray-500'
                            }`}
                          >
                            <div className="flex justify-between text-xs mb-1">
                              <span className={
                                segment.speaker === 'stylist' ? 'text-purple-400' :
                                segment.speaker === 'customer' ? 'text-green-400' : 'text-gray-400'
                              }>
                                {segment.speaker === 'stylist' ? 'スタイリスト' :
                                 segment.speaker === 'customer' ? 'お客様' : '不明'}
                              </span>
                              <span className="text-gray-500">
                                {Math.floor(segment.start_time_ms / 60000)}:{String(Math.floor((segment.start_time_ms % 60000) / 1000)).padStart(2, '0')}
                              </span>
                            </div>
                            <p className="text-gray-200 text-sm">{segment.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center">データを読み込めませんでした</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
