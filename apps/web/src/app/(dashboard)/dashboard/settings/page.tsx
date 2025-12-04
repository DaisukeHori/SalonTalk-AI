'use client';

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">設定</h1>
        <p className="text-gray-500 mt-1">システム設定を管理します</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Salon Settings */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">店舗情報</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">店舗名</label>
              <input
                type="text"
                defaultValue="テストサロン"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">住所</label>
              <input
                type="text"
                defaultValue="東京都渋谷区..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
              <input
                type="text"
                defaultValue="03-1234-5678"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Analysis Settings */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">分析設定</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-800">リアルタイム分析</div>
                <div className="text-sm text-gray-500">セッション中にリアルタイムでスコアを表示</div>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-800">提案タイミング通知</div>
                <div className="text-sm text-gray-500">最適な提案タイミングを通知</div>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-800">成功事例マッチング</div>
                <div className="text-sm text-gray-500">類似の成功事例を自動表示</div>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Plan Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">プラン情報</h2>
          <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
            <div>
              <div className="font-semibold text-primary-700">Standardプラン</div>
              <div className="text-sm text-primary-600">月額 ¥36,000</div>
            </div>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
              プラン変更
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <div>残りセッション数: 85 / 100</div>
            <div>データ保持期間: 90日</div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}
