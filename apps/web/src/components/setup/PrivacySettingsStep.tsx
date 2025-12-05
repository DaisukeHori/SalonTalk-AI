'use client';

interface PrivacySettings {
  require_customer_consent: boolean;
  consent_message: string;
  data_retention_days: number;
  auto_delete_audio: boolean;
}

interface PrivacySettingsStepProps {
  data: PrivacySettings;
  onChange: (data: PrivacySettings) => void;
  onNext: () => void;
  onBack: () => void;
}

const RETENTION_OPTIONS = [
  { value: 30, label: '30日' },
  { value: 60, label: '60日' },
  { value: 90, label: '90日' },
  { value: 180, label: '180日' },
  { value: 365, label: '1年' },
];

export default function PrivacySettingsStep({
  data,
  onChange,
  onNext,
  onBack,
}: PrivacySettingsStepProps) {
  const handleChange = (field: keyof PrivacySettings, value: boolean | string | number) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">プライバシー設定</h2>
      <p className="text-gray-600 mb-8">
        お客様のプライバシー保護に関する設定を行います。
      </p>

      <div className="space-y-6 max-w-2xl">
        {/* 顧客同意の要否 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 pt-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.require_customer_consent}
                  onChange={(e) =>
                    handleChange('require_customer_consent', e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                録音前に顧客の同意を取得
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                録音を開始する前に、お客様へ同意確認画面を表示します。
                法令遵守のため、この設定を有効にすることを推奨します。
              </p>
            </div>
          </div>

          {data.require_customer_consent && (
            <div className="mt-4 ml-15">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                同意確認メッセージ
              </label>
              <textarea
                value={data.consent_message}
                onChange={(e) => handleChange('consent_message', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="お客様への同意確認メッセージを入力してください"
              />
            </div>
          )}
        </div>

        {/* データ保持期間 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            データ保持期間
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            会話データを保存する期間を設定します。期間が過ぎたデータは自動的に削除されます。
          </p>
          <div className="flex flex-wrap gap-2">
            {RETENTION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange('data_retention_days', option.value)}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  data.data_retention_days === option.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 音声データの自動削除 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 pt-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.auto_delete_audio}
                  onChange={(e) =>
                    handleChange('auto_delete_audio', e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                音声データの即時削除
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                音声ファイルを分析完了後24時間以内に自動削除します。
                テキストデータは上記の保持期間まで保存されます。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 rounded-lg p-4 mt-8 mb-8">
        <p className="text-sm text-green-800">
          🔒 <strong>安心:</strong>{' '}
          すべてのデータは暗号化され、国内サーバーで安全に管理されます。
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
