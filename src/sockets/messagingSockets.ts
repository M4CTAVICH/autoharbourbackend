import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import { ENV } from "../config/env.js";
import { setupNotificationSocket } from "./notificationSocket.js"; // Add this import

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userName?: string;
}

export const initializeMessageSockets = (httpServer: HttpServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [ENV.FRONTEND_URL, ENV.FRONTEND_URL_WWW].filter(
        (origin): origin is string => typeof origin === "string"
      ),
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Your existing authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const decoded = jwt.verify(token, ENV.JWT_SECRET!) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, isVerified: true },
      });

      if (!user || !user.isVerified) {
        return next(new Error("Invalid or unverified user"));
      }

      (socket as AuthenticatedSocket).userId = user.id;
      (socket as AuthenticatedSocket).userName = user.name;

      next();
    } catch (error) {
      next(new Error("Invalid authentication token"));
    }
  });

  // Your existing connection handler
  io.on("connection", (socket) => {
    const authSocket = socket as AuthenticatedSocket;

    console.log(
      `User ${authSocket.userName} (ID: ${authSocket.userId}) connected`
    );

    authSocket.join(`user_${authSocket.userId}`);
    updateUserOnlineStatus(authSocket.userId!, true);

    // Your existing message handlers...
    authSocket.on(
      "join_conversation",
      async (data: { otherUserId: number }) => {
        try {
          const { otherUserId } = data;
          const roomName = [authSocket.userId!, otherUserId].sort().join("_");
          authSocket.join(roomName);
          console.log(
            `User ${authSocket.userId} joined conversation with ${otherUserId}`
          );
        } catch (error) {
          console.error("Error joining conversation:", error);
          authSocket.emit("error", { message: "Failed to join conversation" });
        }
      }
    );

    authSocket.on("leave_conversation", (data: { otherUserId: number }) => {
      const { otherUserId } = data;
      const roomName = [authSocket.userId!, otherUserId].sort().join("_");
      authSocket.leave(roomName);
    });

    authSocket.on(
      "send_message",
      async (data: {
        content: string;
        receiverId: number;
        listingId?: number;
      }) => {
        try {
          const { content, receiverId, listingId } = data;

          if (!content || !content.trim()) {
            authSocket.emit("message_error", {
              message: "Message content is required",
            });
            return;
          }

          const receiver = await prisma.user.findUnique({
            where: { id: receiverId },
          });

          if (!receiver) {
            authSocket.emit("message_error", { message: "Receiver not found" });
            return;
          }

          if (authSocket.userId === receiverId) {
            authSocket.emit("message_error", {
              message: "Cannot send message to yourself",
            });
            return;
          }

          const message = await prisma.message.create({
            data: {
              content: content.trim(),
              senderId: authSocket.userId!,
              receiverId,
              listingId: listingId || null,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
              receiver: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          });

          const messageResponse = {
            id: message.id,
            content: message.content,
            isRead: message.isRead,
            listingId: message.listingId || undefined,
            createdAt: message.createdAt,
            sender: {
              id: message.sender.id,
              name: message.sender.name,
              avatar: message.sender.avatar || undefined,
            },
            receiver: {
              id: message.receiver.id,
              name: message.receiver.name,
              avatar: message.receiver.avatar || undefined,
            },
          };

          const roomName = [authSocket.userId!, receiverId].sort().join("_");
          io.to(roomName).emit("new_message", messageResponse);

          io.to(`user_${receiverId}`).emit("message_notification", {
            senderId: authSocket.userId,
            senderName: authSocket.userName,
            content: content.trim(),
            listingId: listingId || undefined,
          });

          authSocket.emit("message_sent", messageResponse);
        } catch (error) {
          console.error("Error sending message:", error);
          authSocket.emit("message_error", {
            message: "Failed to send message",
          });
        }
      }
    );

    // Your other existing handlers (typing, mark read, disconnect...)
    authSocket.on("typing_start", (data: { receiverId: number }) => {
      const { receiverId } = data;
      const roomName = [authSocket.userId!, receiverId].sort().join("_");
      authSocket.to(roomName).emit("user_typing", {
        userId: authSocket.userId,
        userName: authSocket.userName,
      });
    });

    authSocket.on("typing_stop", (data: { receiverId: number }) => {
      const { receiverId } = data;
      const roomName = [authSocket.userId!, receiverId].sort().join("_");
      authSocket.to(roomName).emit("user_stopped_typing", {
        userId: authSocket.userId,
      });
    });

    authSocket.on(
      "mark_messages_read",
      async (data: { fromUserId: number }) => {
        try {
          const { fromUserId } = data;

          const result = await prisma.message.updateMany({
            where: {
              senderId: fromUserId,
              receiverId: authSocket.userId!,
              isRead: false,
            },
            data: {
              isRead: true,
            },
          });

          io.to(`user_${fromUserId}`).emit("messages_read", {
            readBy: authSocket.userId,
            readByName: authSocket.userName,
            count: result.count,
          });

          authSocket.emit("messages_marked_read", { count: result.count });
        } catch (error) {
          console.error("Error marking messages as read:", error);
          authSocket.emit("error", {
            message: "Failed to mark messages as read",
          });
        }
      }
    );

    authSocket.on("disconnect", () => {
      console.log(
        `User ${authSocket.userName} (ID: ${authSocket.userId}) disconnected`
      );
      updateUserOnlineStatus(authSocket.userId!, false);
    });
  });

  setupNotificationSocket(io);

  return io;
};

const updateUserOnlineStatus = async (userId: number, isOnline: boolean) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastSeen: new Date(),
      },
    });
  } catch (error) {
    console.error("Error updating user online status:", error);
  }
};
