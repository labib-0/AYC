import { apiClient } from "@/services/api-client";

export interface AdminNotificationData {
  title?: string;
  message?: string;
  order_id?: string | number;
  order_number?: string;
  stage?: string;
  customer_status?: string;
  total_amount?: number;
  currency?: string;
  url?: string;
  action_url?: string;
  [key: string]: unknown;
}

export interface AdminNotificationItem {
  id: string;
  type: string;
  notifiable_type?: string;
  notifiable_id?: number | string;
  data: AdminNotificationData;
  read_at: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AdminNotificationsResult {
  notifications: AdminNotificationItem[];
  unreadCount: number;
}

export class AdminNotificationService {
  /**
   * Fetch paginated genuine notifications for the authenticated admin user.
   */
  async getNotifications(perPage = 10): Promise<AdminNotificationsResult> {
    try {
      const response = await apiClient.get<any>(`/notifications?per_page=${perPage}`);
      const rawData = response?.data;
      const items: AdminNotificationItem[] = Array.isArray(rawData?.data)
        ? rawData.data
        : Array.isArray(rawData)
        ? rawData
        : [];
      const unreadCount = Number(
        response?.meta?.unread_count ?? items.filter((i) => !i.read_at).length
      );
      return { notifications: items, unreadCount };
    } catch {
      return { notifications: [], unreadCount: 0 };
    }
  }

  /**
   * Fetch current unread notification count.
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<any>("/notifications/unread-count");
      return Number(response?.data?.unread_count ?? 0);
    } catch {
      return 0;
    }
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id: string): Promise<boolean> {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mark all notifications as read.
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      await apiClient.post("/notifications/read-all");
      return true;
    } catch {
      return false;
    }
  }
}

export const adminNotificationService = new AdminNotificationService();
