/**
 * NotificationService
 * プッシュ通知サービス
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiService } from './ApiService';
import { storageService } from './StorageService';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type NotificationListener = (notification: Notifications.Notification) => void;
type ResponseListener = (response: Notifications.NotificationResponse) => void;

class NotificationService {
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private listeners: NotificationListener[] = [];
  private responseListeners: ResponseListener[] = [];

  async initialize(): Promise<string | null> {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });

      await Notifications.setNotificationChannelAsync('session', {
        name: 'Session Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#10B981',
      });
    }

    // Get push token
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await this.registerToken(token);
      return token;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  private async registerToken(token: string): Promise<void> {
    // Save locally
    await storageService.setPushToken(token);

    // Register with server
    try {
      await apiService.registerPushToken(token, Platform.OS as 'ios' | 'android');
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }

  startListening(): void {
    // Listen for incoming notifications
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      this.listeners.forEach((listener) => listener(notification));
    });

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      this.responseListeners.forEach((listener) => listener(response));
    });
  }

  stopListening(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  addNotificationListener(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  addResponseListener(listener: ResponseListener): () => void {
    this.responseListeners.push(listener);
    return () => {
      this.responseListeners = this.responseListeners.filter((l) => l !== listener);
    };
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: trigger || null,
    });
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
