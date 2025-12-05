'use client';

import { useState } from 'react';

interface SalonInfo {
  name: string;
  address: string;
  phone: string;
  business_hours: {
    open: string;
    close: string;
  };
}

interface SalonInfoStepProps {
  data: SalonInfo;
  onChange: (data: SalonInfo) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function SalonInfoStep({
  data,
  onChange,
  onNext,
  onBack,
}: SalonInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.name.trim()) {
      newErrors.name = '店舗名を入力してください';
    }

    if (!data.phone.trim()) {
      newErrors.phone = '電話番号を入力してください';
    } else if (!/^[\d-]+$/.test(data.phone)) {
      newErrors.phone = '有効な電話番号を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  const handleChange = (field: keyof SalonInfo, value: string | { open: string; close: string }) => {
    onChange({ ...data, [field]: value });
  };

  const handleBusinessHoursChange = (field: 'open' | 'close', value: string) => {
    onChange({
      ...data,
      business_hours: { ...data.business_hours, [field]: value },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">店舗情報の入力</h2>
      <p className="text-gray-600 mb-8">
        店舗の基本情報を入力してください。後から変更することもできます。
      </p>

      <div className="space-y-6 max-w-lg">
        {/* 店舗名 */}
        <div>
          <label
            htmlFor="salon-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            店舗名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="salon-name"
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="例: ヘアサロン プレスト 渋谷店"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* 住所 */}
        <div>
          <label
            htmlFor="salon-address"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            住所
          </label>
          <input
            type="text"
            id="salon-address"
            value={data.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="例: 東京都渋谷区神宮前1-2-3"
          />
        </div>

        {/* 電話番号 */}
        <div>
          <label
            htmlFor="salon-phone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            電話番号 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="salon-phone"
            value={data.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="例: 03-1234-5678"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

        {/* 営業時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            営業時間
          </label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={data.business_hours.open}
              onChange={(e) => handleBusinessHoursChange('open', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <span className="text-gray-500">〜</span>
            <input
              type="time"
              value={data.business_hours.close}
              onChange={(e) => handleBusinessHoursChange('close', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          ← 戻る
        </button>
        <button
          type="submit"
          className="px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          次へ →
        </button>
      </div>
    </form>
  );
}
