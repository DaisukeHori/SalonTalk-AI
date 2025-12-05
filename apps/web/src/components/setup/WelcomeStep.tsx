'use client';

interface WelcomeStepProps {
  onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        SalonTalk AI へようこそ！
      </h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        接客会話をAIが分析し、売れるトークを可視化・共有するシステムです。
        <br />
        まずは店舗の基本設定を行いましょう。
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg mx-auto">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl mb-2">📈</div>
          <p className="text-sm text-blue-800 font-medium">売上向上</p>
          <p className="text-xs text-blue-600">+20〜36%</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl mb-2">⏱️</div>
          <p className="text-sm text-green-800 font-medium">育成期間</p>
          <p className="text-xs text-green-600">50%短縮</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl mb-2">👥</div>
          <p className="text-sm text-purple-800 font-medium">離職率</p>
          <p className="text-xs text-purple-600">-30%</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-8 max-w-md mx-auto">
        <h3 className="font-medium text-gray-900 mb-2">セットアップの流れ</h3>
        <ol className="text-sm text-gray-600 text-left space-y-1">
          <li>1. 店舗情報の入力</li>
          <li>2. 料金プランの選択</li>
          <li>3. スタッフの招待（任意）</li>
          <li>4. プライバシー設定</li>
        </ol>
      </div>

      <button
        onClick={onNext}
        className="px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
      >
        始める →
      </button>
    </div>
  );
}
