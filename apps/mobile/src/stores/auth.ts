/**
 * Auth Store
 * 認証状態管理ストア（Supabase Auth連携）
 *
 * 方針: Supabase生成型と同じsnake_caseを使用
 * 詳細は docs/詳細設計書/12-付録.md を参照
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { Staff, Salon } from '@/types/user';
import { getSupabaseClient, signInWithEmail, signOut as supabaseSignOut, getSession, onAuthStateChange } from '@/lib/supabase';
import { apiService } from '@/services';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Staff | null;
  salon: Salon | null;
  accessToken: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: Staff) => void;
  setSalon: (salon: Salon) => void;
  setAccessToken: (token: string | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
}

const USER_DATA_KEY = 'salontalk_user_data';

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  salon: null,
  accessToken: null,

  initialize: async () => {
    try {
      // Get current session from Supabase
      const session = await getSession();

      if (session?.access_token) {
        // Set token for API service
        apiService.setAccessToken(session.access_token);

        // Load cached user data
        const userDataStr = await SecureStore.getItemAsync(USER_DATA_KEY);
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          set({
            isAuthenticated: true,
            accessToken: session.access_token,
            user: userData.user,
            salon: userData.salon,
            isLoading: false,
          });
        } else {
          // Fetch fresh user data from database
          await fetchUserData(session.user.id, session.access_token, set);
        }

        // Subscribe to auth changes
        onAuthStateChange(async (event, newSession) => {
          if (event === 'SIGNED_OUT') {
            apiService.setAccessToken(null);
            set({
              isAuthenticated: false,
              accessToken: null,
              user: null,
              salon: null,
            });
          } else if (event === 'TOKEN_REFRESHED' && newSession) {
            apiService.setAccessToken(newSession.access_token);
            set({ accessToken: newSession.access_token });
          } else if (event === 'SIGNED_IN' && newSession) {
            apiService.setAccessToken(newSession.access_token);
            await fetchUserData(newSession.user.id, newSession.access_token, set);
          }
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      const { data, error } = await signInWithEmail(email, password);

      if (error) {
        set({ isLoading: false });
        throw new Error(error.message);
      }

      if (data.session) {
        // Set token for API service
        apiService.setAccessToken(data.session.access_token);

        // Fetch user data from database
        await fetchUserData(data.user.id, data.session.access_token, set);
      } else {
        set({ isLoading: false });
        throw new Error('ログインに失敗しました');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await supabaseSignOut();
      await SecureStore.deleteItemAsync(USER_DATA_KEY);
      apiService.setAccessToken(null);

      set({
        isAuthenticated: false,
        accessToken: null,
        user: null,
        salon: null,
      });
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  },

  setUser: (user: Staff) => {
    set({ user });
  },

  setSalon: (salon: Salon) => {
    set({ salon });
  },

  setAccessToken: (token: string | null) => {
    set({ accessToken: token });
  },

  setIsAuthenticated: (isAuthenticated: boolean) => {
    set({ isAuthenticated });
  },

  setIsLoading: (isLoading: boolean) => {
    set({ isLoading });
  },
}));

/**
 * Fetch user and salon data from Supabase
 * DB型をそのまま使用（snake_case）
 */
async function fetchUserData(
  authUserId: string,
  accessToken: string,
  set: (state: Partial<AuthState>) => void
) {
  try {
    const supabase = getSupabaseClient();

    // Fetch staff data with salon
    const { data: staff, error: staffError } = await supabase
      .from('staffs')
      .select(`
        *,
        salons (*)
      `)
      .eq('id', authUserId)
      .single();

    if (staffError || !staff) {
      console.error('Failed to fetch staff data:', staffError);
      set({ isLoading: false });
      throw new Error('スタッフ情報の取得に失敗しました');
    }

    // DB型をそのまま使用（snake_case）- 変換不要
    const user: Staff = {
      id: staff.id,
      salon_id: staff.salon_id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      avatar_url: staff.avatar_url,
      is_active: staff.is_active,
      created_at: staff.created_at,
      updated_at: staff.updated_at,
    };

    const salon: Salon = {
      id: staff.salons.id,
      name: staff.salons.name,
      address: staff.salons.address,
      phone: staff.salons.phone,
      plan: staff.salons.plan,
      seats_count: staff.salons.seats_count,
      settings: staff.salons.settings || {
        language: 'ja',
        timezone: 'Asia/Tokyo',
        recording_enabled: true,
        analysis_enabled: true,
        notifications_enabled: true,
        max_concurrent_sessions: 10,
        session_timeout_minutes: 180,
        data_retention_days: 365,
      },
      created_at: staff.salons.created_at,
      updated_at: staff.salons.updated_at,
    };

    // Cache user data
    await SecureStore.setItemAsync(
      USER_DATA_KEY,
      JSON.stringify({ user, salon })
    );

    set({
      isAuthenticated: true,
      accessToken,
      user,
      salon,
      isLoading: false,
    });
  } catch (error) {
    set({ isLoading: false });
    throw error;
  }
}
