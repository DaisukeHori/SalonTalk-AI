'use client';

import { useState } from 'react';

interface StaffInvitation {
  email: string;
  role: 'stylist' | 'manager';
}

interface InviteStaffStepProps {
  invitations: StaffInvitation[];
  onChange: (invitations: StaffInvitation[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function InviteStaffStep({
  invitations,
  onChange,
  onNext,
  onBack,
}: InviteStaffStepProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'stylist' | 'manager'>('stylist');
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAdd = () => {
    setError('');

    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }

    if (!validateEmail(email)) {
      setError('有効なメールアドレスを入力してください');
      return;
    }

    if (invitations.some((inv) => inv.email === email)) {
      setError('このメールアドレスは既に追加されています');
      return;
    }

    onChange([...invitations, { email, role }]);
    setEmail('');
    setRole('stylist');
  };

  const handleRemove = (emailToRemove: string) => {
    onChange(invitations.filter((inv) => inv.email !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">スタッフの招待</h2>
      <p className="text-gray-600 mb-8">
        一緒に使うスタッフを招待しましょう。後から追加することもできます。
      </p>

      {/* 招待フォーム */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label
              htmlFor="staff-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              メールアドレス
            </label>
            <input
              type="email"
              id="staff-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="staff@example.com"
            />
          </div>
          <div className="w-full md:w-40">
            <label
              htmlFor="staff-role"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              役割
            </label>
            <select
              id="staff-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'stylist' | 'manager')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="stylist">スタイリスト</option>
              <option value="manager">マネージャー</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAdd}
              className="w-full md:w-auto px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              追加
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      {/* 招待リスト */}
      {invitations.length > 0 ? (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            招待予定 ({invitations.length}名)
          </h3>
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.email}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-500">👤</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {invitation.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {invitation.role === 'stylist'
                        ? 'スタイリスト'
                        : 'マネージャー'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(invitation.email)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 mb-6 bg-gray-50 rounded-lg">
          <p className="text-gray-500">まだスタッフが追加されていません</p>
          <p className="text-sm text-gray-400 mt-1">
            上のフォームからスタッフを招待してください
          </p>
        </div>
      )}

      <div className="bg-yellow-50 rounded-lg p-4 mb-8">
        <p className="text-sm text-yellow-800">
          ⏭️ <strong>スキップ可能:</strong>{' '}
          スタッフの招待は後からでも行えます。今はスキップして先に進むこともできます。
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
          {invitations.length > 0 ? '次へ →' : 'スキップして次へ →'}
        </button>
      </div>
    </div>
  );
}
