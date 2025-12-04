'use client';

/**
 * useAuth Hook
 * 認証フック
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
  salonId: string;
  salonName: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const fetchUser = useCallback(async () => {
    try {
      // In a real implementation, this would call the Supabase auth API
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const user = await response.json();
        setState({ user, loading: false, error: null });
      } else {
        setState({ user: null, loading: false, error: null });
      }
    } catch (error) {
      setState({ user: null, loading: false, error: 'セッション取得に失敗しました' });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'ログインに失敗しました');
      }

      const user = await response.json();
      setState({ user, loading: false, error: null });
      router.push('/dashboard');
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'ログインに失敗しました',
      }));
    }
  };

  const signOut = async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setState({ user: null, loading: false, error: null });
      router.push('/login');
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'ログアウトに失敗しました',
      }));
    }
  };

  const refreshSession = async () => {
    await fetchUser();
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!state.user) return;

    setState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('プロフィール更新に失敗しました');
      }

      const updatedUser = await response.json();
      setState({ user: updatedUser, loading: false, error: null });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'プロフィール更新に失敗しました',
      }));
    }
  };

  return {
    ...state,
    signIn,
    signOut,
    refreshSession,
    updateProfile,
  };
}

export default useAuth;
