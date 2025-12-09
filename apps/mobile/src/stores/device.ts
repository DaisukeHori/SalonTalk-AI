/**
 * Device Store
 * デバイスアクティベーション・Heartbeat状態管理ストア
 *
 * 方針: Supabase生成型と同じsnake_caseを使用
 * 詳細は docs/詳細設計書/08-画面項目詳細定義.md 8.4.2 を参照
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Heartbeat interval: 2 minutes
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

export interface ActivationResult {
  success: boolean;
  device_id: string;
  device_identifier: string;
  salon_id: string;
  salon_name: string;
  device_name: string;
  seat_number: number | null;
}

interface DeviceState {
  // Device information
  device_id: string | null;
  device_identifier: string | null;
  is_activated: boolean;
  salon_id: string | null;
  salon_name: string | null;
  device_name: string | null;
  seat_number: number | null;

  // Activation state
  is_activating: boolean;
  activation_error: string | null;

  // Heartbeat state
  is_online: boolean;
  last_heartbeat_at: string | null;
  heartbeat_interval_id: ReturnType<typeof setInterval> | null;

  // Revocation state
  is_revoked: boolean;

  // Actions
  check_activation: () => Promise<boolean>;
  activate_device: (code: string) => Promise<ActivationResult>;
  clear_activation: () => void;
  start_heartbeat: () => void;
  stop_heartbeat: () => void;
  send_heartbeat: () => Promise<boolean>;
}

/**
 * Generate device identifier from random UUID
 * This is called once during activation and stored persistently
 */
async function generateDeviceIdentifier(): Promise<string> {
  const uuid = await Crypto.randomUUID();
  return uuid;
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set, get) => ({
      // Initial state
      device_id: null,
      device_identifier: null,
      is_activated: false,
      salon_id: null,
      salon_name: null,
      device_name: null,
      seat_number: null,
      is_activating: false,
      activation_error: null,
      is_online: false,
      last_heartbeat_at: null,
      heartbeat_interval_id: null,
      is_revoked: false,

      /**
       * Check if device is still activated and not revoked
       * Uses heartbeat API to verify device status
       */
      check_activation: async () => {
        const { device_identifier } = get();
        if (!device_identifier) {
          set({ is_activated: false });
          return false;
        }

        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/device-heartbeat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ device_identifier }),
          });

          const result = await response.json();

          if (result.data?.success === true) {
            set({
              is_activated: true,
              is_online: true,
              is_revoked: false,
              last_heartbeat_at: new Date().toISOString(),
            });
            return true;
          } else if (result.data?.revoked === true) {
            // Device has been revoked
            set({
              is_activated: false,
              is_revoked: true,
              is_online: false,
            });
            return false;
          } else {
            set({ is_activated: false, is_online: false });
            return false;
          }
        } catch (error) {
          console.error('Failed to check activation:', error);
          set({ is_online: false });
          // Don't change is_activated on network error - might be temporary
          return get().is_activated;
        }
      },

      /**
       * Activate device with 6-digit code
       */
      activate_device: async (code: string) => {
        set({ is_activating: true, activation_error: null });

        try {
          // Generate unique device identifier
          const device_identifier = await generateDeviceIdentifier();

          const response = await fetch(`${SUPABASE_URL}/functions/v1/activate-device`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              activation_code: code,
              device_identifier,
            }),
          });

          const result = await response.json();

          if (!response.ok || result.error) {
            const errorMessage = result.error?.message || 'アクティベーションに失敗しました';
            set({ is_activating: false, activation_error: errorMessage });
            throw new Error(errorMessage);
          }

          const data = result.data as ActivationResult;

          set({
            device_id: data.device_id,
            device_identifier: data.device_identifier,
            is_activated: true,
            salon_id: data.salon_id,
            salon_name: data.salon_name,
            device_name: data.device_name,
            seat_number: data.seat_number,
            is_activating: false,
            activation_error: null,
            is_revoked: false,
          });

          // Start heartbeat after successful activation
          get().start_heartbeat();

          return data;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'アクティベーションに失敗しました';
          set({ is_activating: false, activation_error: message });
          throw error;
        }
      },

      /**
       * Clear activation data (for logout/reset)
       */
      clear_activation: () => {
        const { heartbeat_interval_id } = get();
        if (heartbeat_interval_id) {
          clearInterval(heartbeat_interval_id);
        }

        set({
          device_id: null,
          device_identifier: null,
          is_activated: false,
          salon_id: null,
          salon_name: null,
          device_name: null,
          seat_number: null,
          is_activating: false,
          activation_error: null,
          is_online: false,
          last_heartbeat_at: null,
          heartbeat_interval_id: null,
          is_revoked: false,
        });
      },

      /**
       * Start heartbeat interval
       */
      start_heartbeat: () => {
        const { heartbeat_interval_id, send_heartbeat } = get();

        // Clear existing interval if any
        if (heartbeat_interval_id) {
          clearInterval(heartbeat_interval_id);
        }

        // Send initial heartbeat
        send_heartbeat();

        // Set up interval
        const intervalId = setInterval(() => {
          send_heartbeat();
        }, HEARTBEAT_INTERVAL_MS);

        set({ heartbeat_interval_id: intervalId });
      },

      /**
       * Stop heartbeat interval
       */
      stop_heartbeat: () => {
        const { heartbeat_interval_id } = get();
        if (heartbeat_interval_id) {
          clearInterval(heartbeat_interval_id);
          set({ heartbeat_interval_id: null, is_online: false });
        }
      },

      /**
       * Send a single heartbeat to update online status
       */
      send_heartbeat: async () => {
        const { device_identifier, is_activated } = get();
        if (!device_identifier || !is_activated) {
          return false;
        }

        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/device-heartbeat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ device_identifier }),
          });

          const result = await response.json();

          if (result.data?.success === true) {
            set({
              is_online: true,
              last_heartbeat_at: new Date().toISOString(),
            });
            return true;
          } else if (result.data?.revoked === true) {
            // Device has been revoked - stop heartbeat and show revocation message
            get().stop_heartbeat();
            set({
              is_activated: false,
              is_revoked: true,
              is_online: false,
            });
            return false;
          } else {
            set({ is_online: false });
            return false;
          }
        } catch (error) {
          console.error('Heartbeat failed:', error);
          set({ is_online: false });
          return false;
        }
      },
    }),
    {
      name: 'salontalk-device',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist heartbeat_interval_id as it's a runtime reference
      partialize: (state) => ({
        device_id: state.device_id,
        device_identifier: state.device_identifier,
        is_activated: state.is_activated,
        salon_id: state.salon_id,
        salon_name: state.salon_name,
        device_name: state.device_name,
        seat_number: state.seat_number,
        is_revoked: state.is_revoked,
      }),
    }
  )
);

export default useDeviceStore;
