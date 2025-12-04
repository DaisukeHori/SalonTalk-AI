'use client';

import { useState } from 'react';

// Mock data
const successCases = [
  {
    id: '1',
    concernKeywords: ['乾燥', 'パサつき'],
    approach:
      '「普段のお手入れで困っていることはありますか？」と聞いた後、「この季節は特に乾燥しやすいですよね。実は私も同じ悩みがあって、このオイルを使い始めたんです」と自分の体験を交えて提案。',
    result: 'ヘアオイル購入。「自分も使っている」という言葉が信頼感につながった。',
    conversionRate: 85,
    stylist: '佐藤花子',
    createdAt: '2024-11-10',
  },
  {
    id: '2',
    concernKeywords: ['ダメージ', '枝毛', 'カラー持ち'],
    approach:
      '「カラー後1週間くらいで色落ちが気になりませんか？」と具体的な悩みを予測して質問。その後、カラー用シャンプーの効果をビフォーアフター写真で説明。',
    result: 'カラーシャンプーとトリートメントのセット購入。視覚的な説明が効果的だった。',
    conversionRate: 78,
    stylist: '田中一郎',
    createdAt: '2024-11-08',
  },
  {
    id: '3',
    concernKeywords: ['広がり', 'うねり', '梅雨'],
    approach:
      '「梅雨の時期、髪がまとまらなくて大変じゃないですか？」と季節の悩みから話を始め、「このスタイリング剤は雨の日でもキープできるんです」と具体的なベネフィットを説明。',
    result: 'スタイリング剤購入。季節に合わせたタイムリーな提案が刺さった。',
    conversionRate: 72,
    stylist: '山田太郎',
    createdAt: '2024-11-05',
  },
  {
    id: '4',
    concernKeywords: ['頭皮', 'べたつき', 'かゆみ'],
    approach:
      'シャンプー中に「頭皮の状態を見させていただきましたが、少し敏感になっているようですね」と専門的な視点からアドバイス。「毎日のケアで改善できますよ」と希望を持たせた。',
    result: '頭皮ケアローション購入。専門家としての信頼感が決め手になった。',
    conversionRate: 82,
    stylist: '佐藤花子',
    createdAt: '2024-11-03',
  },
];

const concernCategories = ['すべて', '乾燥', 'ダメージ', '広がり', '頭皮', 'カラー'];

export default function SuccessCasesPage() {
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredCases = successCases.filter((caseItem) => {
    const matchesCategory =
      selectedCategory === 'すべて' ||
      caseItem.concernKeywords.some((k) => k.includes(selectedCategory));
    const matchesSearch =
      searchQuery === '' ||
      caseItem.approach.includes(searchQuery) ||
      caseItem.concernKeywords.some((k) => k.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">成功事例</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          + 新規登録
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="キーワードで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
          <div className="flex space-x-2">
            {concernCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">登録事例数</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{successCases.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">平均成約率</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">79.3%</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">最も多い悩み</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">乾燥</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">今月の活用回数</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">42回</p>
        </div>
      </div>

      {/* Cases List */}
      <div className="space-y-4">
        {filteredCases.map((caseItem) => (
          <div key={caseItem.id} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Keywords */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {caseItem.concernKeywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>

                {/* Approach */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">アプローチ</h3>
                  <p className="text-gray-800 leading-relaxed">{caseItem.approach}</p>
                </div>

                {/* Result */}
                <div className="bg-green-50 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-green-700 mb-1">結果</h3>
                  <p className="text-green-800">{caseItem.result}</p>
                </div>
              </div>

              {/* Side Info */}
              <div className="ml-6 text-right">
                <div className="mb-4">
                  <p className="text-gray-500 text-sm">成約率</p>
                  <p className="text-3xl font-bold text-primary-600">{caseItem.conversionRate}%</p>
                </div>
                <div className="mb-2">
                  <p className="text-gray-500 text-sm">登録者</p>
                  <p className="text-gray-800">{caseItem.stylist}</p>
                </div>
                <p className="text-gray-400 text-sm">{caseItem.createdAt}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end mt-4 pt-4 border-t space-x-2">
              <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
                編集
              </button>
              <button className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg text-sm">
                削除
              </button>
            </div>
          </div>
        ))}

        {filteredCases.length === 0 && (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <p className="text-gray-500">該当する成功事例が見つかりませんでした</p>
          </div>
        )}
      </div>

      {/* New Case Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">成功事例の新規登録</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  悩みキーワード
                </label>
                <input
                  type="text"
                  placeholder="例: 乾燥, パサつき"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-gray-500 text-xs mt-1">カンマ区切りで複数入力できます</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  アプローチ内容
                </label>
                <textarea
                  rows={4}
                  placeholder="どのように話を切り出し、どのような流れで提案したかを具体的に記載してください"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">結果</label>
                <textarea
                  rows={2}
                  placeholder="購入された商品名や、お客様の反応などを記載してください"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">成約率</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="例: 80"
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      %
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">関連商品</label>
                  <input
                    type="text"
                    placeholder="例: 保湿シャンプー"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  他のサロンにも公開する
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
