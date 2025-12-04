'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Stats {
  todaySessions: number;
  avgScore: number;
  conversionRate: number;
  activeStaff: number;
  sessionChange: number;
  scoreChange: number;
}

interface WeeklyScore {
  day: string;
  score: number;
}

interface StaffPerformance {
  name: string;
  score: number;
}

interface RecentSession {
  id: string;
  staff: string;
  time: string;
  duration: string;
  score: number;
  converted: boolean;
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    todaySessions: 0,
    avgScore: 0,
    conversionRate: 0,
    activeStaff: 0,
    sessionChange: 0,
    scoreChange: 0,
  });
  const [weeklyScores, setWeeklyScores] = useState<WeeklyScore[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();

      // Get current user's salon
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: staff } = await supabase
        .from('staffs')
        .select('salon_id')
        .eq('id', user.id)
        .single() as { data: { salon_id: string } | null };

      if (!staff) {
        setIsLoading(false);
        return;
      }

      const salonId = staff.salon_id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Fetch sessions from the last 7 days
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          id,
          started_at,
          ended_at,
          status,
          stylist_id,
          session_reports (
            overall_score
          ),
          staffs!sessions_stylist_id_fkey (
            id,
            name
          )
        `)
        .eq('salon_id', salonId)
        .eq('status', 'completed')
        .gte('started_at', weekAgo.toISOString())
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error fetching dashboard data:', error);
        setIsLoading(false);
        return;
      }

      // Calculate today's sessions
      const todaySessions = sessions?.filter((s: any) => {
        const sessionDate = new Date(s.started_at);
        return sessionDate >= today;
      }) || [];

      // Calculate scores
      const allScores = sessions
        ?.map((s: any) => s.session_reports?.overall_score)
        .filter((s: any) => s !== undefined && s !== null) || [];
      const avgScore = allScores.length > 0
        ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length)
        : 0;

      // Get unique active staff
      const activeStaffIds = new Set(sessions?.map((s: any) => s.stylist_id));

      // Calculate yesterday's session count for comparison
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdaySessions = sessions?.filter((s: any) => {
        const sessionDate = new Date(s.started_at);
        return sessionDate >= yesterday && sessionDate < today;
      }) || [];
      const sessionChange = todaySessions.length - yesterdaySessions.length;

      setStats({
        todaySessions: todaySessions.length,
        avgScore,
        conversionRate: 0, // Would need conversion tracking
        activeStaff: activeStaffIds.size,
        sessionChange,
        scoreChange: 0, // Would need historical comparison
      });

      // Calculate weekly scores by day
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const weeklyData: WeeklyScore[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const daySessions = sessions?.filter((s: any) => {
          const sessionDate = new Date(s.started_at);
          return sessionDate >= dayStart && sessionDate <= dayEnd;
        }) || [];

        const dayScores = daySessions
          .map((s: any) => s.session_reports?.overall_score)
          .filter((s: any) => s !== undefined && s !== null);
        const dayAvg = dayScores.length > 0
          ? Math.round(dayScores.reduce((a: number, b: number) => a + b, 0) / dayScores.length)
          : 0;

        weeklyData.push({
          day: dayNames[date.getDay()],
          score: dayAvg,
        });
      }
      setWeeklyScores(weeklyData);

      // Calculate staff performance
      const staffMap = new Map<string, { name: string; totalScore: number; count: number }>();
      sessions?.forEach((s: any) => {
        const staffName = s.staffs?.name || '不明';
        const staffId = s.staffs?.id || 'unknown';
        const existing = staffMap.get(staffId) || { name: staffName, totalScore: 0, count: 0 };
        if (s.session_reports?.overall_score) {
          existing.totalScore += s.session_reports.overall_score;
          existing.count++;
        }
        staffMap.set(staffId, existing);
      });

      const staffData: StaffPerformance[] = Array.from(staffMap.values())
        .filter((s) => s.count > 0)
        .map((s) => ({
          name: s.name,
          score: Math.round(s.totalScore / s.count),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setStaffPerformance(staffData);

      // Format recent sessions
      const recentData: RecentSession[] = (sessions || []).slice(0, 5).map((s: any) => {
        const startDate = new Date(s.started_at);
        const endDate = s.ended_at ? new Date(s.ended_at) : null;
        const durationMins = endDate
          ? Math.round((endDate.getTime() - startDate.getTime()) / 1000 / 60)
          : 0;

        return {
          id: s.id,
          staff: s.staffs?.name || '不明',
          time: startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          duration: `${durationMins}分`,
          score: s.session_reports?.overall_score || 0,
          converted: false, // Would need conversion tracking
        };
      });
      setRecentSessions(recentData);

      setIsLoading(false);
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const statCards = [
    {
      label: '本日のセッション',
      value: stats.todaySessions.toString(),
      change: stats.sessionChange !== 0 ? `${stats.sessionChange > 0 ? '+' : ''}${stats.sessionChange}` : '',
      positive: stats.sessionChange >= 0
    },
    {
      label: '平均スコア',
      value: stats.avgScore.toString(),
      change: stats.scoreChange !== 0 ? `${stats.scoreChange > 0 ? '+' : ''}${stats.scoreChange}` : '',
      positive: stats.scoreChange >= 0
    },
    { label: '成約率', value: `${stats.conversionRate}%`, change: '', positive: null },
    { label: 'アクティブスタッフ', value: stats.activeStaff.toString(), change: '', positive: null },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">ダッシュボード</h1>
        <p className="text-gray-500 mt-1">店舗パフォーマンスの概要</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <div className="flex items-end mt-2">
              <span className="text-3xl font-bold text-gray-800">{stat.value}</span>
              {stat.change && stat.positive !== null && (
                <span
                  className={`ml-2 text-sm ${
                    stat.positive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Weekly Score Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">週間スコア推移</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyScores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={{ fill: '#6366F1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Staff Performance */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">スタッフ別スコア</h2>
          <div className="h-64">
            {staffPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={60} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#6366F1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                データがありません
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">最近のセッション</h2>
          <Link href="/dashboard/sessions" className="text-primary-600 text-sm hover:underline">
            すべて見る →
          </Link>
        </div>
        {recentSessions.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-3 font-medium">スタッフ</th>
                <th className="pb-3 font-medium">時間</th>
                <th className="pb-3 font-medium">所要時間</th>
                <th className="pb-3 font-medium">スコア</th>
                <th className="pb-3 font-medium">アクション</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((session) => (
                <tr key={session.id} className="border-b last:border-0">
                  <td className="py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="font-medium text-gray-800">{session.staff}</span>
                    </div>
                  </td>
                  <td className="py-4 text-gray-600">{session.time}</td>
                  <td className="py-4 text-gray-600">{session.duration}</td>
                  <td className="py-4">
                    <span
                      className={`font-semibold ${
                        session.score >= 80
                          ? 'text-green-600'
                          : session.score >= 60
                          ? 'text-primary-600'
                          : 'text-orange-500'
                      }`}
                    >
                      {session.score}点
                    </span>
                  </td>
                  <td className="py-4">
                    <Link
                      href={`/dashboard/sessions/${session.id}`}
                      className="text-primary-600 hover:underline text-sm"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-gray-500">
            最近のセッションはありません
          </div>
        )}
      </div>
    </div>
  );
}
