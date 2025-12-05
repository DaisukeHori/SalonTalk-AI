/**
 * Auth Store
 * 認証状態管理ストア（Supabase Auth連携）
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { Staff, Salon } from '@salontalk/shared';
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

    const user: Staff = {
      id: staff.id,
      salonId: staff.salon_id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      avatarUrl: staff.avatar_url,
      isActive: staff.is_active,
      createdAt: new Date(staff.created_at),
      updatedAt: new Date(staff.updated_at),
    };

    const salon: Salon = {
      id: staff.salons.id,
      name: staff.salons.name,
      address: staff.salons.address,
      phone: staff.salons.phone,
      plan: staff.salons.plan,
      seatsCount: staff.salons.seats_count,
      settings: staff.salons.settings || {
        language: 'ja',
        timezone: 'Asia/Tokyo',
        recordingEnabled: true,
        analysisEnabled: true,
        notificationsEnabled: true,
        maxConcurrentSessions: 10,
        sessionTimeoutMinutes: 180,
        dataRetentionDays: 365,
      },
      createdAt: new Date(staff.salons.created_at),
      updatedAt: new Date(staff.salons.updated_at),
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
