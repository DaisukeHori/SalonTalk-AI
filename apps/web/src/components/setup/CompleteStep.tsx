'use client';

interface CompleteStepProps {
  onComplete: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function CompleteStep({
  onComplete,
  onBack,
  isLoading,
  error,
}: CompleteStepProps) {
  return (
    <div className="text-center">
      <div className="text-6xl mb-6">🎊</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        セットアップ完了！
      </h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        店舗の初期設定が完了しました。
        <br />
        さっそくSalonTalk AIを使い始めましょう！
      </p>

      <div className="bg-gray-50 rounded-lg p-6 mb-8 max-w-lg mx-auto">
        <h3 className="font-medium text-gray-900 mb-4">次のステップ</h3>
        <div className="space-y-4 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-medium text-sm">1</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                iPadアプリをインストール
              </p>
              <p className="text-sm text-gray-500">
                施術中の会話を録音・分析するためのアプリです
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-medium text-sm">2</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">最初のセッションを記録</p>
              <p className="text-sm text-gray-500">
                実際の施術中に録音を開始してみましょう
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-medium text-sm">3</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">分析レポートを確認</p>
              <p className="text-sm text-gray-500">
                ダッシュボードで会話分析の結果を確認できます
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-lg mx-auto">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex justify-between max-w-lg mx-auto">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
        >
          ← 戻る
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={isLoading}
          className="px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              処理中...
            </>
          ) : (
            'ダッシュボードへ →'
          )}
        </button>
      </div>
    </div>
  );
}
