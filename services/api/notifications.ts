import { apiClient } from './client';
import { API_ENDPOINTS } from './config';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: string;
}

export interface ApiNotification {
  _id: string;
  title: string;
  message: string;
  type?: string;
  isRead?: boolean;
  read?: boolean;
  createdAt: string;
}

const mapApiNotificationToNotification = (apiNotif: ApiNotification): Notification => ({
  id: apiNotif._id,
  title: apiNotif.title,
  message: apiNotif.message,
  type: (apiNotif.type as Notification['type']) || 'info',
  isRead: apiNotif.isRead ?? apiNotif.read ?? false,
  createdAt: apiNotif.createdAt,
});

export const notificationsApi = {
  getAll: async (): Promise<Notification[]> => {
    try {
      const response = await apiClient.get<ApiNotification[] | { data: ApiNotification[] }>(
        API_ENDPOINTS.NOTIFICATIONS.BASE
      );
      const notifications = Array.isArray(response) ? response : (response?.data || []);
      return notifications.map(mapApiNotificationToNotification);
    } catch (error) {
      console.error('[notificationsApi.getAll] Error:', error);
      return [];
    }
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await apiClient.get<{ count: number }>(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
      return response.count || 0;
    } catch (error) {
      console.error('[notificationsApi.getUnreadCount] Error:', error);
      return 0;
    }
  },

  markAsRead: async (id: string): Promise<void> => {
    try {
      await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(id), {});
    } catch (error) {
      console.error('[notificationsApi.markAsRead] Error:', error);
    }
  },

  markAllAsRead: async (): Promise<void> => {
    try {
      await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_AS_READ, {});
    } catch (error) {
      console.error('[notificationsApi.markAllAsRead] Error:', error);
    }
  },
};
