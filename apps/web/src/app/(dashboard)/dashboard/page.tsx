'use client';

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

// Mock data
const weeklyScores = [
  { day: '月', score: 72 },
  { day: '火', score: 78 },
  { day: '水', score: 75 },
  { day: '木', score: 82 },
  { day: '金', score: 79 },
  { day: '土', score: 85 },
  { day: '日', score: 88 },
];

const staffPerformance = [
  { name: '佐藤', score: 85 },
  { name: '田中', score: 78 },
  { name: '鈴木', score: 72 },
  { name: '山田', score: 68 },
  { name: '伊藤', score: 65 },
];

const recentSessions = [
  { id: 1, staff: '佐藤', time: '14:30', duration: '45分', score: 85, converted: true },
  { id: 2, staff: '田中', time: '13:00', duration: '60分', score: 72, converted: false },
  { id: 3, staff: '鈴木', time: '11:30', duration: '50分', score: 78, converted: true },
];

export default function DashboardPage() {
  const stats = [
    { label: '本日のセッション', value: '12', change: '+3', positive: true },
    { label: '平均スコア', value: '78', change: '+5', positive: true },
    { label: '成約率', value: '58%', change: '+8%', positive: true },
    { label: 'アクティブスタッフ', value: '5', change: '0', positive: null },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">ダッシュボード</h1>
        <p className="text-gray-500 mt-1">店舗パフォーマンスの概要</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <div className="flex items-end mt-2">
              <span className="text-3xl font-bold text-gray-800">{stat.value}</span>
              {stat.change !== '0' && (
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
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Staff Performance */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">スタッフ別スコア</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={50} />
                <Tooltip />
                <Bar dataKey="score" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">最近のセッション</h2>
          <a href="/dashboard/sessions" className="text-primary-600 text-sm hover:underline">
            すべて見る →
          </a>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b">
              <th className="pb-3 font-medium">スタッフ</th>
              <th className="pb-3 font-medium">時間</th>
              <th className="pb-3 font-medium">所要時間</th>
              <th className="pb-3 font-medium">スコア</th>
              <th className="pb-3 font-medium">ステータス</th>
            </tr>
          </thead>
          <tbody>
            {recentSessions.map((session) => (
              <tr key={session.id} className="border-b last:border-0">
                <td className="py-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                      👤
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
                  {session.converted ? (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
                      成約
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                      未成約
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
