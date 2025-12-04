/**
 * StorageService
 * ストレージサービス（AsyncStorage wrapper）
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  AUTH_TOKEN: '@salontalk:auth_token',
  USER_DATA: '@salontalk:user_data',
  SALON_DATA: '@salontalk:salon_data',
  SETTINGS: '@salontalk:settings',
  LAST_SESSION: '@salontalk:last_session',
  PUSH_TOKEN: '@salontalk:push_token',
};

class StorageService {
  // Auth Token
  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  async removeAuthToken(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  // User Data
  async getUserData<T>(): Promise<T | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  }

  async setUserData<T>(user: T): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }

  async removeUserData(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  // Salon Data
  async getSalonData<T>(): Promise<T | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SALON_DATA);
    return data ? JSON.parse(data) : null;
  }

  async setSalonData<T>(salon: T): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SALON_DATA, JSON.stringify(salon));
  }

  async removeSalonData(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.SALON_DATA);
  }

  // Settings
  async getSettings<T>(): Promise<T | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  }

  async setSettings<T>(settings: T): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Last Session
  async getLastSession<T>(): Promise<T | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SESSION);
    return data ? JSON.parse(data) : null;
  }

  async setLastSession<T>(session: T): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SESSION, JSON.stringify(session));
  }

  async removeLastSession(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SESSION);
  }

  // Push Token
  async getPushToken(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
  }

  async setPushToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
  }

  // Generic
  async get<T>(key: string): Promise<T | null> {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  // Clear all
  async clearAll(): Promise<void> {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  }
}

export const storageService = new StorageService();
export default storageService;
