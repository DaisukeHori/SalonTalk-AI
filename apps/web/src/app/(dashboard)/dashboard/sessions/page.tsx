'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Session {
  id: string;
  staff: string;
  customer: string | null;
  date: string;
  time: string;
  duration: string;
  score: number;
  status: string;
}

export default function SessionsPage() {
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing'>('all');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();

      // Get current user's salon
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staff } = await supabase
        .from('staffs')
        .select('salon_id')
        .eq('id', user.id)
        .single() as { data: { salon_id: string } | null };

      if (!staff) return;

      // Fetch all sessions for this salon
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select(`
          id,
          started_at,
          ended_at,
          status,
          customer_info,
          session_reports (
            overall_score
          ),
          staffs!sessions_stylist_id_fkey (
            name
          )
        `)
        .eq('salon_id', staff.salon_id)
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching sessions:', error);
        setIsLoading(false);
        return;
      }

      // Format sessions
      const formattedSessions: Session[] = (sessionData || []).map((s: any) => {
        const startDate = new Date(s.started_at);
        const endDate = s.ended_at ? new Date(s.ended_at) : null;
        const durationMins = endDate
          ? Math.round((endDate.getTime() - startDate.getTime()) / 1000 / 60)
          : 0;

        return {
          id: s.id,
          staff: s.staffs?.name || '不明',
          customer: s.customer_info?.notes || `${s.customer_info?.gender === 'female' ? '女性' : s.customer_info?.gender === 'male' ? '男性' : ''}${s.customer_info?.ageGroup || ''}`,
          date: startDate.toLocaleDateString('ja-JP'),
          time: startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          duration: `${durationMins}分`,
          score: s.session_reports?.overall_score || 0,
          status: s.status,
        };
      });

      setSessions(formattedSessions);
      setIsLoading(false);
    };

    fetchSessions();
  }, []);

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'completed') return s.status === 'completed';
    if (filter === 'processing') return s.status === 'processing' || s.status === 'recording';
    return true;
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">セッション一覧</h1>
          <p className="text-gray-500 mt-1">すべてのセッションを確認できます</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'completed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            完了
          </button>
          <button
            onClick={() => setFilter('processing')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'processing'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            進行中
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredSessions.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-6 py-4 font-medium">日時</th>
                <th className="px-6 py-4 font-medium">スタッフ</th>
                <th className="px-6 py-4 font-medium">お客様</th>
                <th className="px-6 py-4 font-medium">所要時間</th>
                <th className="px-6 py-4 font-medium">スコア</th>
                <th className="px-6 py-4 font-medium">ステータス</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => (
                <tr key={session.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-800">{session.date}</div>
                      <div className="text-sm text-gray-500">{session.time}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="font-medium text-gray-800">{session.staff}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{session.customer || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{session.duration}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`font-semibold ${
                        session.score >= 80
                          ? 'text-green-600'
                          : session.score >= 60
                          ? 'text-primary-600'
                          : session.score > 0
                          ? 'text-orange-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {session.score > 0 ? `${session.score}点` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {session.status === 'completed' ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
                        完了
                      </span>
                    ) : session.status === 'processing' ? (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                        処理中
                      </span>
                    ) : session.status === 'recording' ? (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm">
                        録音中
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                        {session.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/sessions/${session.id}`}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      詳細 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-500">
            セッションがありません
          </div>
        )}
      </div>
    </div>
  );
}
