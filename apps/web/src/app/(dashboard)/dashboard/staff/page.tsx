'use client';

const staff = [
  { id: 1, name: '佐藤 花子', role: 'スタイリスト', sessions: 45, avgScore: 85, conversionRate: 62 },
  { id: 2, name: '田中 太郎', role: 'マネージャー', sessions: 38, avgScore: 78, conversionRate: 55 },
  { id: 3, name: '鈴木 美咲', role: 'スタイリスト', sessions: 42, avgScore: 72, conversionRate: 48 },
  { id: 4, name: '山田 健一', role: 'アシスタント', sessions: 25, avgScore: 68, conversionRate: 40 },
  { id: 5, name: '伊藤 愛', role: 'アシスタント', sessions: 20, avgScore: 65, conversionRate: 35 },
];

export default function StaffPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">スタッフ管理</h1>
          <p className="text-gray-500 mt-1">スタッフのパフォーマンスを確認できます</p>
        </div>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
          + スタッフ追加
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {staff.map((member) => (
          <div key={member.id} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">👤</span>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-800">{member.name}</h3>
                <span className="text-sm text-gray-500">{member.role}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{member.sessions}</div>
                <div className="text-xs text-gray-500">セッション</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${
                    member.avgScore >= 80
                      ? 'text-green-600'
                      : member.avgScore >= 60
                      ? 'text-primary-600'
                      : 'text-orange-500'
                  }`}
                >
                  {member.avgScore}
                </div>
                <div className="text-xs text-gray-500">平均スコア</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{member.conversionRate}%</div>
                <div className="text-xs text-gray-500">成約率</div>
              </div>
            </div>

            <button className="w-full mt-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">
              詳細を見る
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
