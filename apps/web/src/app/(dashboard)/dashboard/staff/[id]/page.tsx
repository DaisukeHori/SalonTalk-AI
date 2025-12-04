'use client';

import { useParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

// Mock data for staff detail
const staffMember = {
  id: '1',
  name: '佐藤花子',
  email: 'sato@salon.com',
  role: 'stylist',
  position: 'シニアスタイリスト',
  joinDate: '2022-04-01',
  avatarUrl: null,
  stats: {
    totalSessions: 156,
    avgScore: 82.5,
    conversionRate: 28.3,
    rank: 2,
  },
};

const scoreHistory = [
  { date: '10/1', score: 78 },
  { date: '10/8', score: 80 },
  { date: '10/15', score: 82 },
  { date: '10/22', score: 79 },
  { date: '10/29', score: 85 },
  { date: '11/5', score: 83 },
  { date: '11/12', score: 86 },
];

const indicatorScores = [
  { indicator: 'トーク比率', score: 85, avg: 75 },
  { indicator: '質問分析', score: 78, avg: 72 },
  { indicator: '感情分析', score: 88, avg: 80 },
  { indicator: '悩み検出', score: 82, avg: 70 },
  { indicator: '提案タイミング', score: 75, avg: 68 },
  { indicator: '提案品質', score: 80, avg: 74 },
  { indicator: '成約', score: 70, avg: 65 },
];

const radarData = indicatorScores.map((item) => ({
  subject: item.indicator,
  本人: item.score,
  店舗平均: item.avg,
  fullMark: 100,
}));

const recentSessions = [
  { id: '1', date: '2024-11-12', duration: '1:30:00', score: 86, converted: true },
  { id: '2', date: '2024-11-11', duration: '1:15:00', score: 83, converted: false },
  { id: '3', date: '2024-11-10', duration: '2:00:00', score: 88, converted: true },
  { id: '4', date: '2024-11-09', duration: '1:45:00', score: 80, converted: false },
  { id: '5', date: '2024-11-08', duration: '1:20:00', score: 79, converted: false },
];

export default function StaffDetailPage() {
  const params = useParams();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-3xl text-primary-600">
              {staffMember.name.charAt(0)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{staffMember.name}</h1>
            <p className="text-gray-500">{staffMember.position}</p>
            <p className="text-sm text-gray-400">入社日: {staffMember.joinDate}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            編集
          </button>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            レポート出力
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">総セッション数</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {staffMember.stats.totalSessions}
          </p>
          <p className="text-sm text-green-600 mt-1">+12 今月</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">平均スコア</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {staffMember.stats.avgScore}
          </p>
          <p className="text-sm text-green-600 mt-1">+2.3 先月比</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">成約率</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {staffMember.stats.conversionRate}%
          </p>
          <p className="text-sm text-green-600 mt-1">+1.5% 先月比</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">ランキング</p>
          <p className="text-3xl font-bold text-primary-600 mt-2">
            {staffMember.stats.rank}位
          </p>
          <p className="text-sm text-gray-400 mt-1">全10名中</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Score Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">スコア推移</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={scoreHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[60, 100]} />
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

        {/* Radar Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">指標別分析</h2>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="本人"
                dataKey="本人"
                stroke="#6366F1"
                fill="#6366F1"
                fillOpacity={0.3}
              />
              <Radar
                name="店舗平均"
                dataKey="店舗平均"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.3}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Indicator Details */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">指標別スコア詳細</h2>
        <div className="space-y-4">
          {indicatorScores.map((item, index) => (
            <div key={index} className="flex items-center">
              <div className="w-32 text-sm text-gray-600">{item.indicator}</div>
              <div className="flex-1 mx-4">
                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary-500 rounded-full"
                    style={{ width: `${item.score}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-green-500"
                    style={{ left: `${item.avg}%` }}
                    title={`店舗平均: ${item.avg}`}
                  />
                </div>
              </div>
              <div className="w-16 text-right">
                <span className="text-lg font-semibold text-gray-800">{item.score}</span>
                <span className="text-xs text-gray-400 ml-1">/ 100</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
          <span>緑のラインは店舗平均を示しています</span>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">最近のセッション</h2>
          <button className="text-primary-600 text-sm hover:underline">すべて表示</button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b">
              <th className="pb-3">日付</th>
              <th className="pb-3">時間</th>
              <th className="pb-3">スコア</th>
              <th className="pb-3">成約</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {recentSessions.map((session) => (
              <tr key={session.id} className="border-b last:border-b-0">
                <td className="py-4 text-gray-800">{session.date}</td>
                <td className="py-4 text-gray-600">{session.duration}</td>
                <td className="py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-sm ${
                      session.score >= 85
                        ? 'bg-green-100 text-green-700'
                        : session.score >= 70
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {session.score}
                  </span>
                </td>
                <td className="py-4">
                  {session.converted ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="py-4">
                  <button className="text-primary-600 text-sm hover:underline">詳細</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Improvement Suggestions */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-primary-800 mb-4">AIからの改善提案</h2>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <span className="text-primary-600 text-xl">💡</span>
            <div>
              <p className="text-primary-800 font-medium">提案タイミングの改善</p>
              <p className="text-primary-700 text-sm">
                お客様の悩みを検出してから提案までの時間をもう少し短くすると、成約率が上がる傾向があります。
                目安は3分以内です。
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-primary-600 text-xl">📊</span>
            <div>
              <p className="text-primary-800 font-medium">オープンクエスチョンの活用</p>
              <p className="text-primary-700 text-sm">
                「どのような」「どんな」から始まる質問を増やすと、お客様の本音を引き出しやすくなります。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
