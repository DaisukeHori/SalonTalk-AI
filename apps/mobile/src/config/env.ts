/**
 * Environment Configuration
 * 環境設定
 */
import Constants from 'expo-constants';

// Get environment variables from Expo
const expoConfig = Constants.expoConfig?.extra ?? {};

export const ENV = {
  // API URLs
  SUPABASE_URL: expoConfig.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: expoConfig.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',

  // Feature Flags
  ENABLE_ANALYTICS: expoConfig.enableAnalytics ?? true,
  ENABLE_PUSH_NOTIFICATIONS: expoConfig.enablePushNotifications ?? true,
  ENABLE_DEBUG_MODE: expoConfig.enableDebugMode ?? __DEV__,

  // App Config
  APP_NAME: 'SalonTalk AI',
  APP_VERSION: Constants.expoConfig?.version ?? '1.0.0',
  BUILD_NUMBER: Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '1',

  // Audio Config
  AUDIO_CHUNK_DURATION_MS: 60000, // 60 seconds
  MAX_RECORDING_DURATION_MS: 7200000, // 2 hours
  SAMPLE_RATE: 16000,

  // Session Config
  SESSION_TIMEOUT_MS: 10800000, // 3 hours
  REALTIME_RECONNECT_DELAY_MS: 3000,

  // Analysis Config
  MIN_ANALYSIS_CHUNK_SIZE: 10, // Minimum words for analysis
  CONCERN_SIMILARITY_THRESHOLD: 0.7,

  // Cache Config
  CACHE_TTL_MS: 300000, // 5 minutes
};

export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;

export default ENV;
