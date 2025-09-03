import prisma from "../config/db.js";
import type {
  NotificationType,
  Notification,
  NotificationSetting,
} from "@prisma/client";

let io: any = null;

export const setSocketInstance = (SocketInstance: any) => {
  io = SocketInstance;
};

export const createNotificationService = async ({
  userId,
  type,
  title,
  message,
  data = null,
}: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data,
      },
    });

    if (io) {
      io.to(`user_${userId}`).emit("new_notification", {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: false,
        createdAt: notification.createdAt,
      });

      const unreadCount = await prisma.notification.count({
        where: { userId, read: false },
      });

      io.to(`user_${userId}`).emit("notification_count_updated", {
        unreadCount,
      });
    }

    const settings = await prisma.notificationSetting.findUnique({
      where: { userId },
    });

    if (!settings) {
      await prisma.notificationSetting.create({
        data: { userId },
      });
    }

    const emailEnabled = settings?.emailNotifications ?? true;
    const typeEmailEnabled = getEmailEnabledForType(type, settings);

    if (emailEnabled && typeEmailEnabled) {
      await prisma.notificationQueue.create({
        data: {
          userId,
          type,
          title,
          message,
          data,
        },
      });
    }

    return notification;
  } catch (error) {
    console.error("Create notification service error:", error);
    throw error;
  }
};

export const getUserNotificationsService = async ({
  userId,
  page = 1,
  limit = 20,
  unreadOnly = false,
}: {
  userId: number;
  page: number;
  limit: number;
  unreadOnly?: boolean;
}) => {
  try {
    const skip = (page - 1) * limit;
    const whereClause: any = { userId };

    if (unreadOnly) {
      whereClause.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: whereClause,
      }),
      prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  } catch (error) {
    console.error("Get user notifications service error:", error);
    throw error;
  }
};

export const markNotificationAsReadService = async (
  notificationId: number,
  userId: number
) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    if (io) {
      const unreadCount = await prisma.notification.count({
        where: { userId, read: false },
      });

      io.to(`user_${userId}`).emit("notification_count_updated", {
        unreadCount,
      });
    }

    return updatedNotification;
  } catch (error) {
    console.error("Mark notification as read service error:", error);
    throw error;
  }
};

export const markAllNotificationsAsReadService = async (userId: number) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    if (io) {
      io.to(`user_${userId}`).emit("notification_count_updated", {
        unreadCount: 0,
      });
    }

    return result;
  } catch (error) {
    console.error("Mark all notifications as read service error:", error);
    throw error;
  }
};

export const getNotificationSettingsService = async (userId: number) => {
  try {
    let settings = await prisma.notificationSetting.findUnique({
      where: { userId },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.notificationSetting.create({
        data: { userId },
      });
    }

    return settings;
  } catch (error) {
    console.error("Get notification settings service error:", error);
    throw error;
  }
};

export const updateNotificationSettingsService = async (
  userId: number,
  settingsData: {
    emailNotifications?: boolean;
    newMessageEmail?: boolean;
    searchMatchEmail?: boolean;
    listingInquiryEmail?: boolean;
    listingFavoritedEmail?: boolean;
    reportResolvedEmail?: boolean;
    weeklyDigestEmail?: boolean;
  }
) => {
  try {
    const settings = await prisma.notificationSetting.upsert({
      where: { userId },
      update: settingsData,
      create: {
        userId,
        ...settingsData,
      },
    });

    return settings;
  } catch (error) {
    console.error("Update notification settings service error:", error);
    throw error;
  }
};

// Helper function to check if email is enabled for specific notification type
const getEmailEnabledForType = (
  type: NotificationType,
  settings: NotificationSetting | null
): boolean => {
  if (!settings) return true;

  switch (type) {
    case "NEW_MESSAGE":
      return settings.newMessageEmail ?? true;
    case "SEARCH_MATCH":
      return settings.searchMatchEmail ?? true;
    case "LISTING_INQUIRY":
      return settings.listingInquiryEmail ?? true;
    case "LISTING_FAVORITED":
      return settings.listingFavoritedEmail ?? false;
    case "REPORT_RESOLVED":
      return settings.reportResolvedEmail ?? true;
    case "WEEKLY_DIGEST":
      return settings.weeklyDigestEmail ?? true;
    default:
      return true;
  }
};
