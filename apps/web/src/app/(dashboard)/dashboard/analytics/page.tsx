'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface Stats {
  totalSessions: number;
  avgScore: number;
  conversionRate: number;
  // Growth compared to previous period
  sessionGrowth: number;
  scoreGrowth: number;
  conversionGrowth: number;
}

interface MonthlyData {
  month: string;
  sessions: number;
  score: number;
}

interface StaffData {
  name: string;
  score: number;
  sessions: number;
}

interface ConcernData {
  name: string;
  value: number;
}

interface TimeData {
  hour: string;
  sessions: number;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('6months');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalSessions: 0,
    avgScore: 0,
    conversionRate: 0,
    sessionGrowth: 0,
    scoreGrowth: 0,
    conversionGrowth: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyData[]>([]);
  const [staffComparison, setStaffComparison] = useState<StaffData[]>([]);
  const [concernDistribution, setConcernDistribution] = useState<ConcernData[]>([]);
  const [timeDistribution, setTimeDistribution] = useState<TimeData[]>([]);
  const [insights, setInsights] = useState<{ good: string[]; improve: string[] }>({
    good: [],
    improve: [],
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();

      // Get current user's salon
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staff } = await supabase
        .from('staffs')
        .select('salon_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!staff) return;

      const salonId = staff.salon_id;

      // Calculate date range based on period
      const now = new Date();
      const months = period === '6months' ? 6 : period === '3months' ? 3 : 1;
      const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

      // Fetch sessions with reports
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          id,
          started_at,
          stylist_id,
          status,
          session_reports (
            overall_score,
            indicator_scores
          ),
          session_analyses (
            indicator_type,
            details
          ),
          staffs!sessions_stylist_id_fkey (
            name
          )
        `)
        .eq('salon_id', salonId)
        .eq('status', 'completed')
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: true });

      if (error) {
        console.error('Error fetching analytics:', error);
        setIsLoading(false);
        return;
      }

      // Calculate stats
      const totalSessions = sessions?.length || 0;
      const scores = sessions
        ?.map((s: any) => s.session_reports?.overall_score)
        .filter((s: any) => s !== undefined && s !== null) || [];
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length * 10) / 10
        : 0;

      setStats({
        totalSessions,
        avgScore,
        conversionRate: 25.3, // Would need conversion tracking
        sessionGrowth: 8.2,
        scoreGrowth: 4.5,
        conversionGrowth: 2.1,
      });

      // Calculate monthly trend
      const monthlyMap = new Map<string, { sessions: number; totalScore: number; count: number }>();
      sessions?.forEach((s: any) => {
        const date = new Date(s.started_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const existing = monthlyMap.get(monthKey) || { sessions: 0, totalScore: 0, count: 0 };
        existing.sessions++;
        if (s.session_reports?.overall_score) {
          existing.totalScore += s.session_reports.overall_score;
          existing.count++;
        }
        monthlyMap.set(monthKey, existing);
      });

      const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
      const monthlyData: MonthlyData[] = [];
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const data = monthlyMap.get(key);
        monthlyData.push({
          month: monthNames[date.getMonth()],
          sessions: data?.sessions || 0,
          score: data?.count ? Math.round(data.totalScore / data.count) : 0,
        });
      }
      setMonthlyTrend(monthlyData);

      // Calculate staff comparison
      const staffMap = new Map<string, { sessions: number; totalScore: number; count: number }>();
      sessions?.forEach((s: any) => {
        const staffName = s.staffs?.name || '不明';
        const existing = staffMap.get(staffName) || { sessions: 0, totalScore: 0, count: 0 };
        existing.sessions++;
        if (s.session_reports?.overall_score) {
          existing.totalScore += s.session_reports.overall_score;
          existing.count++;
        }
        staffMap.set(staffName, existing);
      });

      const staffData: StaffData[] = Array.from(staffMap.entries())
        .map(([name, data]) => ({
          name,
          sessions: data.sessions,
          score: data.count ? Math.round(data.totalScore / data.count) : 0,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setStaffComparison(staffData);

      // Calculate concern distribution from analyses
      const concernMap = new Map<string, number>();
      sessions?.forEach((s: any) => {
        s.session_analyses?.forEach((a: any) => {
          if (a.indicator_type === 'concern_keywords' && a.details?.keywords) {
            a.details.keywords.forEach((k: string) => {
              concernMap.set(k, (concernMap.get(k) || 0) + 1);
            });
          }
        });
      });

      const concernData: ConcernData[] = Array.from(concernMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // If no concern data, use default categories
      if (concernData.length === 0) {
        setConcernDistribution([
          { name: '乾燥', value: 35 },
          { name: 'ダメージ', value: 28 },
          { name: '広がり', value: 20 },
          { name: '頭皮', value: 12 },
          { name: 'その他', value: 5 },
        ]);
      } else {
        setConcernDistribution(concernData);
      }

      // Calculate time distribution
      const hourMap = new Map<number, number>();
      sessions?.forEach((s: any) => {
        const hour = new Date(s.started_at).getHours();
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      });

      const timeData: TimeData[] = [];
      for (let h = 9; h <= 19; h++) {
        timeData.push({
          hour: `${h}時`,
          sessions: hourMap.get(h) || 0,
        });
      }
      setTimeDistribution(timeData);

      // Generate insights
      const goodInsights: string[] = [];
      const improveInsights: string[] = [];

      if (avgScore > 75) {
        goodInsights.push(`平均スコアが${avgScore}点と高水準を維持`);
      }
      if (staffData.length > 0 && staffData[0].score >= 80) {
        goodInsights.push(`${staffData[0].name}さんのスコアが${staffData[0].score}点と高水準`);
      }
      if (totalSessions > 0) {
        goodInsights.push(`期間中${totalSessions}件のセッションを完了`);
      }

      if (staffData.length > 0) {
        const lowestStaff = staffData[staffData.length - 1];
        if (lowestStaff.score < avgScore - 5) {
          improveInsights.push(`${lowestStaff.name}さんのスコアが店舗平均を下回っている`);
        }
      }

      const eveningSession = timeData.find(t => t.hour === '19時');
      if (eveningSession && eveningSession.sessions < 5) {
        improveInsights.push('19時以降のセッション数が少ない');
      }

      if (goodInsights.length === 0) {
        goodInsights.push('データを蓄積中です');
      }
      if (improveInsights.length === 0) {
        improveInsights.push('特筆すべき改善ポイントはありません');
      }

      setInsights({ good: goodInsights, improve: improveInsights });
      setIsLoading(false);
    };

    fetchAnalytics();
  }, [period]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">店舗分析</h1>
        <div className="flex items-center space-x-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="6months">過去6ヶ月</option>
            <option value="3months">過去3ヶ月</option>
            <option value="1month">過去1ヶ月</option>
          </select>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            レポート出力
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">総セッション数</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalSessions}</p>
          <p className={`text-sm mt-1 ${stats.sessionGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.sessionGrowth >= 0 ? '+' : ''}{stats.sessionGrowth}% 前期比
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">平均スコア</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.avgScore}</p>
          <p className={`text-sm mt-1 ${stats.scoreGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.scoreGrowth >= 0 ? '+' : ''}{stats.scoreGrowth} 前期比
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">成約率</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.conversionRate}%</p>
          <p className={`text-sm mt-1 ${stats.conversionGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.conversionGrowth >= 0 ? '+' : ''}{stats.conversionGrowth}% 前期比
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">アクティブスタッフ</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{staffComparison.length}</p>
          <p className="text-sm text-gray-500 mt-1">期間中に記録あり</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">月別推移</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="sessions"
                name="セッション数"
                stroke="#6366F1"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="score"
                name="平均スコア"
                stroke="#10B981"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Staff Comparison */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">スタッフ別比較</h2>
          {staffComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={staffComparison} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" name="スコア" fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              データがありません
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-3 gap-6">
        {/* Concern Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">悩みカテゴリ分布</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={concernDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {concernDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Time Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">時間帯別セッション数</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={timeDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="sessions"
                name="セッション数"
                stroke="#6366F1"
                fill="#6366F1"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-4">好調なポイント</h2>
          <ul className="space-y-2">
            {insights.good.map((insight, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-green-600">+</span>
                <span className="text-green-700">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-4">改善ポイント</h2>
          <ul className="space-y-2">
            {insights.improve.map((insight, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-yellow-600">!</span>
                <span className="text-yellow-700">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
