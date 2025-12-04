'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resetPassword } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error: resetError } = await resetPassword(email);

      if (resetError) {
        if (resetError.message.includes('User not found')) {
          setError('このメールアドレスは登録されていません');
        } else {
          setError(resetError.message);
        }
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('リクエストの送信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">メールを送信しました</h1>
            <p className="text-gray-600">
              パスワードリセット用のリンクを送信しました。<br />
              メールをご確認ください。
            </p>
          </div>

          <Link
            href="/login"
            className="block w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors text-center"
          >
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">パスワードをお忘れですか？</h1>
          <p className="text-gray-500">
            登録したメールアドレスを入力してください。<br />
            パスワードリセット用のリンクをお送りします。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="email@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? '送信中...' : 'リセットリンクを送信'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-primary-600 hover:underline">
            ログイン画面に戻る
          </Link>
        </div>
      </div>

      <p className="text-center text-gray-400 text-sm mt-8">
        © 2025 Revol Corporation
      </p>
    </div>
  );
}
