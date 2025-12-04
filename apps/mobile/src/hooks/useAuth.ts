/**
 * useAuth Hook
 * 認証フック
 */
import { useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { apiService } from '@/services';

export function useAuth() {
  const router = useRouter();
  const {
    user,
    salon,
    accessToken,
    isAuthenticated,
    isLoading,
    login: storeLogin,
    logout: storeLogout,
  } = useAuthStore();

  // Update API service token when accessToken changes
  useEffect(() => {
    if (accessToken) {
      apiService.setAccessToken(accessToken);
    }
  }, [accessToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        await storeLogin(email, password);
        router.replace('/(main)/home');
        return { success: true };
      } catch (error) {
        console.error('Login error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'ログインに失敗しました',
        };
      }
    },
    [router, storeLogin]
  );

  const logout = useCallback(async () => {
    try {
      await storeLogout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router, storeLogout]);

  return {
    user,
    salon,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
}

export default useAuth;
