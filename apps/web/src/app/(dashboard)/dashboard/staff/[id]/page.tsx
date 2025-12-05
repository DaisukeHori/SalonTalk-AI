'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface StaffDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string | null;
  avatarUrl: string | null;
  profileImageUrl?: string | null; // For compatibility
  joinDate: string | null;
  isActive: boolean;
}

interface Session {
  id: string;
  date: string;
  time: string;
  duration: string;
  score: number;
  status: string;
}

interface PerformanceData {
  date: string;
  score: number;
}

const roleLabels: Record<string, string> = {
  owner: 'オーナー',
  manager: 'マネージャー',
  stylist: 'スタイリスト',
  assistant: 'アシスタント',
  admin: '管理者',
};

export default function StaffDetailPage() {
  const params = useParams();
  const staffId = params.id as string;

  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    avgScore: 0,
    conversionRate: 0,
    monthlyGrowth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStaffDetail = async () => {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();

      // Fetch staff details
      const { data: staffData, error: staffError } = await supabase
        .from('staffs')
        .select('*')
        .eq('id', staffId)
        .single() as { data: any; error: any };

      if (staffError || !staffData) {
        console.error('Error fetching staff:', staffError);
        setIsLoading(false);
        return;
      }

      setStaff({
        id: staffData.id,
        name: staffData.name,
        email: staffData.email,
        role: staffData.role,
        position: staffData.position,
        avatarUrl: staffData.avatar_url || staffData.profile_image_url,
        profileImageUrl: staffData.profile_image_url,
        joinDate: staffData.join_date,
        isActive: staffData.is_active,
      });

      // Fetch sessions for this staff
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          id,
          started_at,
          ended_at,
          status,
          session_reports (
            overall_score
          )
        `)
        .eq('stylist_id', staffId)
        .gte('started_at', thirtyDaysAgo.toISOString())
        .order('started_at', { ascending: false }) as { data: any[] | null; error: any };

      if (sessionError) {
        console.error('Error fetching sessions:', sessionError);
      }

      // Format sessions
      const formattedSessions: Session[] = (sessionData || []).map((s: any) => {
        const startDate = new Date(s.started_at);
        const endDate = s.ended_at ? new Date(s.ended_at) : null;
        const duration = endDate
          ? Math.round((endDate.getTime() - startDate.getTime()) / 1000 / 60)
          : 0;

        return {
          id: s.id,
          date: startDate.toLocaleDateString('ja-JP'),
          time: startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          duration: `${duration}分`,
          score: s.session_reports?.overall_score || 0,
          status: s.status,
        };
      });

      setSessions(formattedSessions);

      // Calculate stats
      const scores = (sessionData || [])
        .map((s: any) => s.session_reports?.overall_score)
        .filter((s: any) => s !== undefined && s !== null);
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : 0;

      setStats({
        totalSessions: (sessionData || []).length,
        avgScore,
        conversionRate: 0, // Would need conversion tracking
        monthlyGrowth: 0, // Would need historical comparison
      });

      // Calculate performance trend (last 7 days)
      const performanceTrend: PerformanceData[] = [];
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const daySessions = (sessionData || []).filter((s: any) => {
          const sessionDate = new Date(s.started_at);
          return sessionDate >= dayStart && sessionDate <= dayEnd;
        });

        const dayScores = daySessions
          .map((s: any) => s.session_reports?.overall_score)
          .filter((s: any) => s !== undefined && s !== null);
        const dayAvg = dayScores.length > 0
          ? Math.round(dayScores.reduce((a: number, b: number) => a + b, 0) / dayScores.length)
          : 0;

        performanceTrend.push({
          date: dayNames[date.getDay()],
          score: dayAvg,
        });
      }

      setPerformanceData(performanceTrend);
      setIsLoading(false);
    };

    fetchStaffDetail();
  }, [staffId]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">スタッフが見つかりません</p>
        <Link href="/dashboard/staff" className="text-primary-600 hover:underline mt-4 inline-block">
          スタッフ一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/staff" className="text-gray-500 hover:text-gray-700 mb-4 inline-block">
          ← スタッフ一覧に戻る
        </Link>
        <div className="flex items-center mt-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center relative overflow-hidden">
            {(staff.avatarUrl || staff.profileImageUrl) ? (
              <Image
                src={staff.avatarUrl || staff.profileImageUrl || ''}
                alt={staff.name}
                fill
                sizes="64px"
                className="rounded-full object-cover"
              />
            ) : (
              <span className="text-3xl">
                {staff.role === 'owner' ? '👑' : staff.role === 'manager' ? '👔' : '👤'}
              </span>
            )}
          </div>
          <div className="ml-6">
            <h1 className="text-3xl font-bold text-gray-800">{staff.name}</h1>
            <div className="flex items-center mt-1 space-x-3">
              <span className="text-gray-500">{roleLabels[staff.role]}</span>
              {staff.position && (
                <span className="text-gray-400">({staff.position})</span>
              )}
              {!staff.isActive && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                  無効
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">今月のセッション</p>
          <div className="flex items-end mt-2">
            <span className="text-3xl font-bold text-gray-800">{stats.totalSessions}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">平均スコア</p>
          <div className="flex items-end mt-2">
            <span className="text-3xl font-bold text-gray-800">{stats.avgScore}</span>
            <span className="ml-2 text-sm text-green-600">+{stats.monthlyGrowth}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">成約率</p>
          <div className="flex items-end mt-2">
            <span className="text-3xl font-bold text-gray-800">{stats.conversionRate}%</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">入社日</p>
          <div className="flex items-end mt-2">
            <span className="text-xl font-bold text-gray-800">
              {staff.joinDate ? new Date(staff.joinDate).toLocaleDateString('ja-JP') : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">週間スコア推移</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
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

      {/* Recent Sessions */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">最近のセッション</h2>
        {sessions.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-3 font-medium">日時</th>
                <th className="pb-3 font-medium">所要時間</th>
                <th className="pb-3 font-medium">スコア</th>
                <th className="pb-3 font-medium">ステータス</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 10).map((session) => (
                <tr key={session.id} className="border-b last:border-0">
                  <td className="py-4">
                    <div className="font-medium text-gray-800">{session.date}</div>
                    <div className="text-sm text-gray-500">{session.time}</div>
                  </td>
                  <td className="py-4 text-gray-600">{session.duration}</td>
                  <td className="py-4">
                    <span
                      className={`font-semibold \${
                        session.score >= 80
                          ? 'text-green-600'
                          : session.score >= 60
                          ? 'text-primary-600'
                          : session.score > 0
                          ? 'text-orange-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {session.score > 0 ? `\${session.score}点` : '-'}
                    </span>
                  </td>
                  <td className="py-4">
                    <span
                      className={`px-2 py-1 rounded text-sm \${
                        session.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {session.status === 'completed' ? '完了' : session.status}
                    </span>
                  </td>
                  <td className="py-4">
                    <Link
                      href={`/dashboard/sessions/\${session.id}`}
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
            セッションがありません
          </div>
        )}
      </div>
    </div>
  );
}
