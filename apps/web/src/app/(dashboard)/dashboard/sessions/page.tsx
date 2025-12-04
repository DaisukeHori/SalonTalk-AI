'use client';

import { useState } from 'react';

const sessions = [
  { id: 1, staff: '佐藤', customer: 'A様', date: '2024-12-04', time: '14:30', duration: '45分', score: 85, converted: true },
  { id: 2, staff: '田中', customer: 'B様', date: '2024-12-04', time: '13:00', duration: '60分', score: 72, converted: false },
  { id: 3, staff: '鈴木', customer: 'C様', date: '2024-12-04', time: '11:30', duration: '50分', score: 78, converted: true },
  { id: 4, staff: '山田', customer: 'D様', date: '2024-12-04', time: '10:00', duration: '40分', score: 65, converted: false },
  { id: 5, staff: '佐藤', customer: 'E様', date: '2024-12-03', time: '16:00', duration: '55分', score: 91, converted: true },
  { id: 6, staff: '田中', customer: 'F様', date: '2024-12-03', time: '14:00', duration: '45分', score: 68, converted: false },
];

export default function SessionsPage() {
  const [filter, setFilter] = useState<'all' | 'converted' | 'not_converted'>('all');

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'converted') return s.converted;
    if (filter === 'not_converted') return !s.converted;
    return true;
  });

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
            onClick={() => setFilter('converted')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'converted'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            成約
          </button>
          <button
            onClick={() => setFilter('not_converted')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'not_converted'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            未成約
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
                      👤
                    </div>
                    <span className="font-medium text-gray-800">{session.staff}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{session.customer}</td>
                <td className="px-6 py-4 text-gray-600">{session.duration}</td>
                <td className="px-6 py-4">
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
                <td className="px-6 py-4">
                  {session.converted ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                      成約
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                      未成約
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button className="text-primary-600 hover:underline text-sm">詳細</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
