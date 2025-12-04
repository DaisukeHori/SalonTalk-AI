/**
 * Settings Store
 * 設定の状態管理
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationPreferences {
  concernAlert: boolean;
  sessionComplete: boolean;
  trainingReminder: boolean;
  scoreAlert: boolean;
}

interface DisplayPreferences {
  showScore: boolean;
  showRanking: boolean;
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

interface SessionPreferences {
  autoStartRecording: boolean;
  vibrationFeedback: boolean;
  soundFeedback: boolean;
  chunkDurationSeconds: number;
}

interface SettingsState {
  notification: NotificationPreferences;
  display: DisplayPreferences;
  session: SessionPreferences;
  language: 'ja' | 'en';
  isOnboarded: boolean;

  // Actions
  setNotificationPreference: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => void;
  setDisplayPreference: <K extends keyof DisplayPreferences>(
    key: K,
    value: DisplayPreferences[K]
  ) => void;
  setSessionPreference: <K extends keyof SessionPreferences>(
    key: K,
    value: SessionPreferences[K]
  ) => void;
  setLanguage: (language: 'ja' | 'en') => void;
  setIsOnboarded: (value: boolean) => void;
  resetToDefaults: () => void;
}

const defaultState = {
  notification: {
    concernAlert: true,
    sessionComplete: true,
    trainingReminder: true,
    scoreAlert: true,
  },
  display: {
    showScore: true,
    showRanking: true,
    darkMode: false,
    fontSize: 'medium' as const,
  },
  session: {
    autoStartRecording: false,
    vibrationFeedback: true,
    soundFeedback: false,
    chunkDurationSeconds: 60,
  },
  language: 'ja' as const,
  isOnboarded: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultState,

      setNotificationPreference: (key, value) =>
        set((state) => ({
          notification: { ...state.notification, [key]: value },
        })),

      setDisplayPreference: (key, value) =>
        set((state) => ({
          display: { ...state.display, [key]: value },
        })),

      setSessionPreference: (key, value) =>
        set((state) => ({
          session: { ...state.session, [key]: value },
        })),

      setLanguage: (language) => set({ language }),

      setIsOnboarded: (value) => set({ isOnboarded: value }),

      resetToDefaults: () => set(defaultState),
    }),
    {
      name: 'salontalk-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useSettingsStore;
