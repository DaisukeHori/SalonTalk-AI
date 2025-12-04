'use client';

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

// Mock data
const monthlyTrend = [
  { month: '6月', sessions: 145, score: 72, conversion: 22 },
  { month: '7月', sessions: 158, score: 74, conversion: 24 },
  { month: '8月', sessions: 162, score: 76, conversion: 25 },
  { month: '9月', sessions: 175, score: 78, conversion: 26 },
  { month: '10月', sessions: 182, score: 79, conversion: 27 },
  { month: '11月', sessions: 168, score: 81, conversion: 28 },
];

const staffComparison = [
  { name: '佐藤', score: 85, sessions: 42 },
  { name: '田中', score: 82, sessions: 38 },
  { name: '山田', score: 78, sessions: 35 },
  { name: '鈴木', score: 75, sessions: 40 },
  { name: '高橋', score: 72, sessions: 28 },
];

const concernDistribution = [
  { name: '乾燥', value: 35 },
  { name: 'ダメージ', value: 28 },
  { name: '広がり', value: 20 },
  { name: '頭皮', value: 12 },
  { name: 'その他', value: 5 },
];

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const timeDistribution = [
  { hour: '9時', sessions: 5 },
  { hour: '10時', sessions: 12 },
  { hour: '11時', sessions: 18 },
  { hour: '12時', sessions: 15 },
  { hour: '13時', sessions: 20 },
  { hour: '14時', sessions: 22 },
  { hour: '15時', sessions: 18 },
  { hour: '16時', sessions: 16 },
  { hour: '17時', sessions: 14 },
  { hour: '18時', sessions: 10 },
  { hour: '19時', sessions: 6 },
];

const productSales = [
  { name: '保湿シャンプー', count: 45, revenue: 225000 },
  { name: 'ダメージケアトリートメント', count: 38, revenue: 228000 },
  { name: 'ヘアオイル', count: 52, revenue: 156000 },
  { name: '頭皮ケアローション', count: 28, revenue: 168000 },
  { name: 'スタイリング剤', count: 35, revenue: 105000 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">店舗分析</h1>
        <div className="flex items-center space-x-4">
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
            <option>過去6ヶ月</option>
            <option>過去3ヶ月</option>
            <option>過去1ヶ月</option>
            <option>今週</option>
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
          <p className="text-3xl font-bold text-gray-800 mt-2">990</p>
          <p className="text-sm text-green-600 mt-1">+8.2% 前期比</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">平均スコア</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">77.3</p>
          <p className="text-sm text-green-600 mt-1">+4.5 前期比</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">成約率</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">25.3%</p>
          <p className="text-sm text-green-600 mt-1">+2.1% 前期比</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm">店販売上</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">¥882,000</p>
          <p className="text-sm text-green-600 mt-1">+12.3% 前期比</p>
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
              <YAxis yAxisId="right" orientation="right" />
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={staffComparison} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" name="スコア" fill="#6366F1" />
            </BarChart>
          </ResponsiveContainer>
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

      {/* Product Sales Table */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">店販商品ランキング</h2>
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b">
              <th className="pb-3">順位</th>
              <th className="pb-3">商品名</th>
              <th className="pb-3">販売数</th>
              <th className="pb-3">売上</th>
              <th className="pb-3">進捗</th>
            </tr>
          </thead>
          <tbody>
            {productSales.map((product, index) => (
              <tr key={product.name} className="border-b last:border-b-0">
                <td className="py-4">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-sm ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : index === 1
                        ? 'bg-gray-100 text-gray-700'
                        : index === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="py-4 text-gray-800 font-medium">{product.name}</td>
                <td className="py-4 text-gray-600">{product.count}個</td>
                <td className="py-4 text-gray-800 font-medium">
                  ¥{product.revenue.toLocaleString()}
                </td>
                <td className="py-4 w-48">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${(product.count / 60) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-4">📈 好調なポイント</h2>
          <ul className="space-y-2">
            <li className="flex items-start space-x-2">
              <span className="text-green-600">✓</span>
              <span className="text-green-700">平均スコアが前期比+4.5ポイント向上</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600">✓</span>
              <span className="text-green-700">店販売上が12.3%増加</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600">✓</span>
              <span className="text-green-700">佐藤さんのスコアが85点と高水準</span>
            </li>
          </ul>
        </div>
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-4">⚡ 改善ポイント</h2>
          <ul className="space-y-2">
            <li className="flex items-start space-x-2">
              <span className="text-yellow-600">!</span>
              <span className="text-yellow-700">高橋さんのスコアが店舗平均を下回っている</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-yellow-600">!</span>
              <span className="text-yellow-700">19時以降のセッション数が少ない</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-yellow-600">!</span>
              <span className="text-yellow-700">頭皮ケア商品の提案機会を増やせる可能性</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
