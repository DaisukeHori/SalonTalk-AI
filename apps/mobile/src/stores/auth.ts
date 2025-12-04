import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { Staff, Salon } from '@salontalk/shared';

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
  setUser: (user: Staff, salon: Salon) => void;
}

const TOKEN_KEY = 'salontalk_access_token';
const USER_KEY = 'salontalk_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  salon: null,
  accessToken: null,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userStr = await SecureStore.getItemAsync(USER_KEY);

      if (token && userStr) {
        const userData = JSON.parse(userStr);
        set({
          isAuthenticated: true,
          accessToken: token,
          user: userData.user,
          salon: userData.salon,
          isLoading: false,
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
      // TODO: Implement actual Supabase auth
      // const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      // For now, mock the login
      const mockUser: Staff = {
        id: 'staff_1' as any,
        salonId: 'salon_1' as any,
        email,
        name: 'テストスタイリスト',
        role: 'stylist',
        avatarUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSalon: Salon = {
        id: 'salon_1' as any,
        name: 'テストサロン',
        address: null,
        phone: null,
        plan: 'standard',
        seatsCount: 5,
        settings: {
          language: 'ja',
          timezone: 'Asia/Tokyo',
          recordingEnabled: true,
          analysisEnabled: true,
          notificationsEnabled: true,
          maxConcurrentSessions: 10,
          sessionTimeoutMinutes: 180,
          dataRetentionDays: 365,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await SecureStore.setItemAsync(TOKEN_KEY, 'mock_token');
      await SecureStore.setItemAsync(
        USER_KEY,
        JSON.stringify({ user: mockUser, salon: mockSalon })
      );

      set({
        isAuthenticated: true,
        accessToken: 'mock_token',
        user: mockUser,
        salon: mockSalon,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);

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

  setUser: (user: Staff, salon: Salon) => {
    set({ user, salon });
  },
}));
