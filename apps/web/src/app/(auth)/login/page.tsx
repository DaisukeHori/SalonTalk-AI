'use client';

import { useState } from 'react';
import { signInWithEmail, getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: authError } = await signInWithEmail(email, password);

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('メールアドレスまたはパスワードが正しくありません');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('メールアドレスが確認されていません');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.session) {
        const userId = data.session.user.id;
        const supabase = getSupabaseBrowserClient();

        // Check if user is an operator (operator_admins table)
        const { data: operator } = await supabase
          .from('operator_admins')
          .select('id, is_active')
          .eq('id', userId)
          .single();

        if (operator && operator.is_active) {
          // User is an active operator → redirect to admin
          window.location.href = '/admin';
          return;
        }

        // Check if user is a staff (staffs table)
        const { data: staff } = await supabase
          .from('staffs')
          .select('id, is_active')
          .eq('id', userId)
          .single();

        if (staff && staff.is_active) {
          // User is an active staff → redirect to dashboard
          window.location.href = '/dashboard';
          return;
        }

        // User exists in auth but not in staffs or operator_admins
        setError('アカウントが見つかりません。管理者にお問い合わせください。');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">SalonTalk AI</h1>
          <p className="text-gray-500">管理ダッシュボード</p>
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="パスワード"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? '読み込み中...' : 'ログイン'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/forgot-password" className="text-sm text-primary-600 hover:underline">
            パスワードをお忘れですか？
          </a>
        </div>
      </div>

      <p className="text-center text-gray-400 text-sm mt-8">
        © 2025 Revol Corporation
      </p>
    </div>
  );
}
