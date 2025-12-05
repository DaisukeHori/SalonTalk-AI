/**
 * Notification Store
 * 通知の状態管理
 */
import { create } from 'zustand';

type NotificationType = 'concern_detected' | 'proposal_chance' | 'score_alert' | 'session_complete' | 'training_reminder' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  successTalk?: string;
  recommendedProduct?: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  currentNotification: Notification | null;
  showNotification: boolean;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  showCurrentNotification: (notification: Notification) => void;
  hideCurrentNotification: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  currentNotification: null,
  showNotification: false,

  addNotification: (notificationData) =>
    set((state) => {
      const notification: Notification = {
        ...notificationData,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false,
      };
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
        currentNotification: notification,
        showNotification: true,
      };
    }),

  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      const wasUnread = notification && !notification.read;
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
      };
    }),

  clearAll: () =>
    set({
      notifications: [],
      unreadCount: 0,
      currentNotification: null,
      showNotification: false,
    }),

  showCurrentNotification: (notification) =>
    set({
      currentNotification: notification,
      showNotification: true,
    }),

  hideCurrentNotification: () =>
    set({
      showNotification: false,
    }),
}));

export default useNotificationStore;
