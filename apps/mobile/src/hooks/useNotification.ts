/**
 * useNotification Hook
 * 通知管理フック
 */
import { useState, useCallback, useEffect } from 'react';
import { Vibration, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

type NotificationType = 'concern_detected' | 'proposal_chance' | 'score_alert' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  successTalk?: string;
  recommendedProduct?: string;
  timestamp: Date;
  read: boolean;
}

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  // Request permission and get push token
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [notifications]);

  const registerForPushNotifications = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return;
    }

    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setExpoPushToken(token);
    } catch (error) {
      console.error('Failed to get push token:', error);
    }
  };

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);

    // Vibrate
    Vibration.vibrate([0, 200, 100, 200]);

    return newNotification;
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const getLatestUnread = useCallback(() => {
    return notifications.find((n) => !n.read) || null;
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    expoPushToken,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    getLatestUnread,
  };
}

export default useNotification;
