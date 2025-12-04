'use client';

/**
 * useAuth Hook
 * 認証フック - Supabase Authを使用
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSupabaseBrowserClient,
  signInWithEmail,
  signOut as supabaseSignOut,
} from '@/lib/supabase/client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
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
      const supabase = getSupabaseBrowserClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        setState({ user: null, loading: false, error: null });
        return;
      }

      // Fetch staff and salon info
      const { data: staff, error: staffError } = await supabase
        .from('staffs')
        .select(`
          id,
          name,
          email,
          role,
          avatar_url,
          salon_id,
          salons (
            id,
            name
          )
        `)
        .eq('id', authUser.id)
        .single();

      if (staffError || !staff) {
        setState({ user: null, loading: false, error: 'スタッフ情報の取得に失敗しました' });
        return;
      }

      setState({
        user: {
          id: staff.id,
          email: staff.email,
          name: staff.name,
          role: staff.role,
          salonId: staff.salon_id,
          salonName: (staff.salons as any)?.name || '',
          avatarUrl: staff.avatar_url || undefined,
        },
        loading: false,
        error: null,
      });
    } catch (error) {
      setState({ user: null, loading: false, error: 'セッション取得に失敗しました' });
    }
  }, []);

  useEffect(() => {
    fetchUser();

    // Subscribe to auth changes
    const supabase = getSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUser();
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, loading: false, error: null });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser]);

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await signInWithEmail(email, password);

      if (error) {
        throw new Error(error.message || 'ログインに失敗しました');
      }

      await fetchUser();
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
      await supabaseSignOut();
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

  return {
    ...state,
    signIn,
    signOut,
    refreshSession,
  };
}

export default useAuth;
