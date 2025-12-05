'use client';

type Plan = 'free' | 'standard' | 'premium';

interface PlanStepProps {
  selected: Plan;
  onChange: (plan: Plan) => void;
  onNext: () => void;
  onBack: () => void;
}

const PLANS = [
  {
    id: 'free' as Plan,
    name: 'フリープラン',
    price: '¥0',
    period: '/月',
    description: '基本機能を無料でお試し',
    features: [
      'スタッフ2名まで',
      '月10セッションまで',
      '基本分析機能',
      '7日間データ保持',
    ],
    recommended: false,
  },
  {
    id: 'standard' as Plan,
    name: 'スタンダード',
    price: '¥9,800',
    period: '/月',
    description: '小規模サロン向け',
    features: [
      'スタッフ5名まで',
      '月50セッションまで',
      '詳細分析機能',
      '90日間データ保持',
      '成功事例検索',
      'レポート出力',
    ],
    recommended: true,
  },
  {
    id: 'premium' as Plan,
    name: 'プレミアム',
    price: '¥29,800',
    period: '/月',
    description: '中〜大規模サロン向け',
    features: [
      'スタッフ無制限',
      'セッション無制限',
      '高度なAI分析',
      '無制限データ保持',
      '成功事例共有',
      'AIロールプレイ研修',
      '専用サポート',
    ],
    recommended: false,
  },
];

export default function PlanStep({
  selected,
  onChange,
  onNext,
  onBack,
}: PlanStepProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">料金プランの選択</h2>
      <p className="text-gray-600 mb-8">
        店舗の規模に合わせてプランをお選びください。後からいつでも変更できます。
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => onChange(plan.id)}
            className={`relative text-left p-6 rounded-xl border-2 transition-all ${
              selected === plan.id
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                  おすすめ
                </span>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {plan.name}
              </h3>
              <p className="text-sm text-gray-500">{plan.description}</p>
            </div>

            <div className="mb-4">
              <span className="text-3xl font-bold text-gray-900">
                {plan.price}
              </span>
              <span className="text-gray-500">{plan.period}</span>
            </div>

            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary-600 mt-0.5">✓</span>
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>

            {selected === plan.id && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-blue-50 rounded-lg p-4 mb-8">
        <p className="text-sm text-blue-800">
          💡 <strong>ヒント:</strong>{' '}
          まずはフリープランで機能をお試しいただき、必要に応じてアップグレードすることをおすすめします。
        </p>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          ← 戻る
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          次へ →
        </button>
      </div>
    </div>
  );
}
