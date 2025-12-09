'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getMe } from '@/lib/admin/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Sign in with Supabase Auth
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(signInError);
        setIsLoading(false);
        return;
      }

      // Verify user is an operator by calling getMe
      const { data: operator, error: meError } = await getMe();

      if (meError) {
        // User authenticated but not an operator
        if (meError.code === 'FORBIDDEN') {
          setError('This account is not an operator account');
        } else {
          setError(meError.message);
        }
        setIsLoading(false);
        return;
      }

      if (operator) {
        // Use push and don't reset loading - let the new page handle its own loading state
        router.push('/admin');
        // Don't set loading to false - keep showing loading until navigation completes
        return;
      } else {
        setError('Failed to verify operator account');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-500 mb-2">SalonTalk Admin</h1>
          <p className="text-gray-400">Operator Console</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-lg text-sm border border-red-500/20">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="operator@salontalk.jp"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Password"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Login'}
          </button>
        </form>
      </div>

      <p className="text-center text-gray-500 text-sm mt-8">
        Revol Corporation - Internal Use Only
      </p>
    </div>
  );
}
