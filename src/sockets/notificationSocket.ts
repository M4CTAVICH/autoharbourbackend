import { Server } from "socket.io";
import {
  setSocketInstance,
  markNotificationAsReadService,
  markAllNotificationsAsReadService,
} from "../services/notificationService.js";
import prisma from "../config/db.js";

export const setupNotificationSocket = (io: Server) => {
  //socket instance
  setSocketInstance(io);

  io.on("connection", (socket: any) => {
    console.log(`User ${socket.userId} connected to notification system`);

    //join notif room
    socket.join(`user_${socket.userId}`);

    //mark as read
    socket.on("mark_notification_read", async (notificationId: number) => {
      try {
        await markNotificationAsReadService(notificationId, socket.userId);
        socket.emit("notification_marked_read", { notificationId });
      } catch (error) {
        socket.emit("notification_error", {
          message: "Failed to mark notification as read",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    //mark all as read
    socket.on("mark_all_notifications_read", async () => {
      try {
        const result = await markAllNotificationsAsReadService(socket.userId);
        socket.emit("all_notifications_marked_read", {
          updatedCount: result.count,
        });
      } catch (error) {
        socket.emit("notification_error", {
          message: "Failed to mark all notifications as read",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    //notif count
    socket.on("get_notification_count", async () => {
      try {
        const unreadCount = await prisma.notification.count({
          where: { userId: socket.userId, read: false },
        });

        socket.emit("notification_count_updated", { unreadCount });
      } catch (error) {
        socket.emit("notification_error", {
          message: "Failed to get notification count",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    //disconnect
    socket.on("disconnect", () => {
      console.log(
        `User ${socket.userId} disconnected from notification system`
      );
    });
  });
};
