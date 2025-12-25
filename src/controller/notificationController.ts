import type { Request, Response } from "express";
import {
  getUserNotificationsService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService,
  getNotificationSettingsService,
  updateNotificationSettingsService,
} from "../services/notificationService.js";

// Get user notifications
export const getUserNotificationsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === "true";

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
      return;
    }

    const result = await getUserNotificationsService({
      userId,
      page,
      limit,
      unreadOnly,
    });

    res.status(200).json({
      success: true,
      message: `Retrieved ${result.notifications.length} notifications`,
      data: result,
    });
  } catch (error: any) {
    console.error("Get user notifications controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications",
    });
  }
};

// Mark notification as read
export const markNotificationAsReadController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const notificationId = parseInt(req.params.id || "");
    const userId = (req as any).user.userId;

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
      return;
    }

    const notification = await markNotificationAsReadService(
      notificationId,
      userId
    );

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: { notification },
    });
  } catch (error: any) {
    console.error("Mark notification as read controller error:", error);

    if (error.message === "Notification not found") {
      res.status(404).json({
        success: false,
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsReadController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const result = await markAllNotificationsAsReadService(userId);

    res.status(200).json({
      success: true,
      message: `Marked ${result.count} notifications as read`,
      data: { updatedCount: result.count },
    });
  } catch (error: any) {
    console.error("Mark all notifications as read controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
    });
  }
};

// Get notification settings
export const getNotificationSettingsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const settings = await getNotificationSettingsService(userId);

    res.status(200).json({
      success: true,
      message: "Notification settings retrieved successfully",
      data: { settings },
    });
  } catch (error: any) {
    console.error("Get notification settings controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve notification settings",
    });
  }
};

// Update notification settings
export const updateNotificationSettingsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const {
      emailNotifications,
      newMessageEmail,
      searchMatchEmail,
      listingInquiryEmail,
      listingFavoritedEmail,
      reportResolvedEmail,
      weeklyDigestEmail,
    } = req.body;

    // Validate boolean fields
    const booleanFields = {
      emailNotifications,
      newMessageEmail,
      searchMatchEmail,
      listingInquiryEmail,
      listingFavoritedEmail,
      reportResolvedEmail,
      weeklyDigestEmail,
    };

    // Filter out undefined values and validate booleans
    const settingsData: any = {};
    for (const [key, value] of Object.entries(booleanFields)) {
      if (value !== undefined) {
        if (typeof value !== "boolean") {
          res.status(400).json({
            success: false,
            message: `${key} must be a boolean value`,
          });
          return;
        }
        settingsData[key] = value;
      }
    }

    if (Object.keys(settingsData).length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid settings provided",
      });
      return;
    }

    const settings = await updateNotificationSettingsService(
      userId,
      settingsData
    );

    res.status(200).json({
      success: true,
      message: "Notification settings updated successfully",
      data: { settings },
    });
  } catch (error: any) {
    console.error("Update notification settings controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notification settings",
    });
  }
};

// Get notification count (unread count)
export const getNotificationCountController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const result = await getUserNotificationsService({
      userId,
      page: 1,
      limit: 1,
      unreadOnly: false,
    });

    res.status(200).json({
      success: true,
      message: "Notification count retrieved successfully",
      data: {
        unreadCount: result.unreadCount,
        totalCount: result.pagination.total,
      },
    });
  } catch (error: any) {
    console.error("Get notification count controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve notification count",
    });
  }
};
