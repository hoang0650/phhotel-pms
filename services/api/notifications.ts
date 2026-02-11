import { apiClient } from './client';
import { API_ENDPOINTS } from './config';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'system' | 'booking' | 'payment' | 'maintenance' | 'staff' | 'guest' | 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  userId?: string;
  action?: {
    type: 'link' | 'button';
    text?: string;
    url?: string;
  };
  metadata?: any;
  createdAt: string;
  expiresAt?: string;
}

export interface Announcement {
  id: string;
  type: 'maintenance' | 'update' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate?: string;
  isActive: boolean;
  targetRoles?: string[];
  targetBusinesses?: string[];
  targetHotels?: string[];
  targetType?: 'system' | 'business' | 'hotel';
  notificationType?: 'booking' | 'checkin' | 'checkout' | 'payment' | 'cancellation' | 'lowInventory' | 'systemError' | 'general' | 'registration' | 'contact';
  userId?: string;
  isRead?: boolean;
  createdAt: string;
  createdBy?: string;
}

export interface ApiNotification {
  _id: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  isRead?: boolean;
  read?: boolean;
  priority?: string;
  action?: {
    type: 'link' | 'button';
    text?: string;
    url?: string;
  };
  metadata?: any;
  createdAt: string;
  expiresAt?: string;
}

export interface ApiAnnouncement {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  targetRoles?: string[];
  targetBusinesses?: string[];
  targetHotels?: string[];
  targetType?: 'system' | 'business' | 'hotel';
  notificationType?: string;
  userId?: string;
  isRead?: boolean;
  createdAt: string;
  createdBy?: string;
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    total: number;
    system: number;
    hotel: number;
  };
}

export interface NotificationResponse {
  success: boolean;
  message?: string;
  data: Announcement[];
}

const mapApiNotificationToNotification = (apiNotif: ApiNotification): Notification => ({
  id: apiNotif._id,
  userId: apiNotif.userId,
  title: apiNotif.title,
  message: apiNotif.message,
  type: (apiNotif.type as Notification['type']) || 'info',
  isRead: apiNotif.isRead ?? apiNotif.read ?? false,
  priority: (apiNotif.priority as Notification['priority']) || 'medium',
  action: apiNotif.action,
  metadata: apiNotif.metadata,
  createdAt: apiNotif.createdAt,
  expiresAt: apiNotif.expiresAt,
});

const mapApiAnnouncementToAnnouncement = (apiAnn: ApiAnnouncement): Announcement => ({
  id: apiAnn.id,
  type: (apiAnn.type as Announcement['type']) || 'info',
  title: apiAnn.title,
  message: apiAnn.message,
  priority: (apiAnn.priority as Announcement['priority']) || 'medium',
  startDate: apiAnn.startDate,
  endDate: apiAnn.endDate,
  isActive: apiAnn.isActive,
  targetRoles: apiAnn.targetRoles,
  targetBusinesses: apiAnn.targetBusinesses,
  targetHotels: apiAnn.targetHotels,
  targetType: apiAnn.targetType,
  notificationType: apiAnn.notificationType,
  userId: apiAnn.userId,
  isRead: apiAnn.isRead,
  createdAt: apiAnn.createdAt,
  createdBy: apiAnn.createdBy,
});

export const notificationsApi = {
  // Get all user notifications
  getAll: async (): Promise<Notification[]> => {
    try {
      const response = await apiClient.get<NotificationResponse>(API_ENDPOINTS.NOTIFICATIONS.BASE);
      const announcements = response?.data ? response.data.map(mapApiAnnouncementToAnnouncement) : [];
      return announcements.map(a => ({
        id: a.id,
        title: a.title,
        message: a.message,
        type: (a.type as Notification['type']) || 'info',
        isRead: !!a.isRead,
        priority: a.priority,
        userId: a.userId,
        action: undefined,
        metadata: { targetType: a.targetType, notificationType: a.notificationType },
        createdAt: a.createdAt,
        expiresAt: a.endDate,
      }));
    } catch (error) {
      console.error('[notificationsApi.getAll] Error:', error);
      return [];
    }
  },

  // Get all announcements (admin/system notifications)
  getAnnouncements: async (): Promise<Announcement[]> => {
    try {
      const response = await apiClient.get<NotificationResponse>(API_ENDPOINTS.NOTIFICATIONS.BASE);
      if (response.success && response.data) {
        return response.data.map(mapApiAnnouncementToAnnouncement);
      }
      return [];
    } catch (error) {
      console.error('[notificationsApi.getAnnouncements] Error:', error);
      return [];
    }
  },

  // Get unread count for both notifications and announcements
  getUnreadCount: async (): Promise<{ total: number; system: number; hotel: number }> => {
    try {
      const response = await apiClient.get<UnreadCountResponse>(
        `${API_ENDPOINTS.NOTIFICATIONS.BASE}/unread-count`
      );
      if (response.success && response.data) {
        return response.data;
      }
      return { total: 0, system: 0, hotel: 0 };
    } catch (error) {
      console.error('[notificationsApi.getUnreadCount] Error:', error);
      return { total: 0, system: 0, hotel: 0 };
    }
  },

  // Mark notification as read
  markAsRead: async (id: string): Promise<void> => {
    try {
      await apiClient.put(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/${id}/read`, {});
    } catch (error) {
      console.error('[notificationsApi.markAsRead] Error:', error);
    }
  },

  // Mark announcement as read
  markAnnouncementAsRead: async (id: string): Promise<void> => {
    try {
      await apiClient.post(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/${id}/read`, {});
    } catch (error) {
      console.error('[notificationsApi.markAnnouncementAsRead] Error:', error);
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    try {
      await apiClient.post(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/read-all`, {});
    } catch (error) {
      console.error('[notificationsApi.markAllAsRead] Error:', error);
    }
  },

  // Create new announcement (admin only)
  createAnnouncement: async (announcement: Partial<Announcement>): Promise<any> => {
    try {
      const response = await apiClient.post(
        `${API_ENDPOINTS.NOTIFICATIONS.BASE}/announcements`,
        announcement
      );
      return response;
    } catch (error) {
      console.error('[notificationsApi.createAnnouncement] Error:', error);
      throw error;
    }
  },

  // Update announcement (admin only)
  updateAnnouncement: async (id: string, announcement: Partial<Announcement>): Promise<any> => {
    try {
      const response = await apiClient.put(
        `${API_ENDPOINTS.NOTIFICATIONS.BASE}/announcements/${id}`,
        announcement
      );
      return response;
    } catch (error) {
      console.error('[notificationsApi.updateAnnouncement] Error:', error);
      throw error;
    }
  },

  // Delete announcement (admin only)
  deleteAnnouncement: async (id: string): Promise<any> => {
    try {
      const response = await apiClient.delete(
        `${API_ENDPOINTS.NOTIFICATIONS.BASE}/announcements/${id}`
      );
      return response;
    } catch (error) {
      console.error('[notificationsApi.deleteAnnouncement] Error:', error);
      throw error;
    }
  },
};
