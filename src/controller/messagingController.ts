import type { Request, Response } from "express";
import {
  sendMessage,
  getUserConversations,
  getMessagesBetweenUsers,
  markMessagesAsRead,
  getUnreadMessageCount,
  deleteMessage,
} from "../services/messagingService.js";
import type { CreateMessageDTO } from "../types/message.js";

const getAuthenticatedUser = (req: Request) => {
  return (req as any).user;
};

export const sendMessageController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const messageData: CreateMessageDTO = req.body;

    if (!messageData.content?.trim()) {
      res.status(400).json({
        success: false,
        message: "Message content is required",
      });
      return;
    }

    if (!messageData.receiverId) {
      res.status(400).json({
        success: false,
        message: "Receiver ID is required",
      });
      return;
    }

    const message = await sendMessage(user.userId, messageData);

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });
  } catch (error: any) {
    console.error("Send message controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to send message",
    });
  }
};

export const getUserConversationsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const conversations = await getUserConversations(user.userId);

    res.status(200).json({
      success: true,
      message: "Conversations retrieved successfully",
      data: conversations,
    });
  } catch (error: any) {
    console.error("Get conversations controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve conversations",
    });
  }
};

export const getMessagesBetweenUsersController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const otherUserId = parseInt(req.params.userId || "");
    if (isNaN(otherUserId)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const result = await getMessagesBetweenUsers(
      user.userId,
      otherUserId,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      message: "Messages retrieved successfully",
      data: result.messages,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Get messages controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve messages",
    });
  }
};

// Mark messages as read
export const markMessagesAsReadController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const fromUserId = parseInt(req.params.userId || "");
    if (isNaN(fromUserId)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    const result = await markMessagesAsRead(user.userId, fromUserId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { updatedCount: result.updatedCount },
    });
  } catch (error: any) {
    console.error("Mark messages as read controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
    });
  }
};

export const getUnreadCountController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const count = await getUnreadMessageCount(user.userId);

    res.status(200).json({
      success: true,
      message: "Unread count retrieved successfully",
      data: { unreadCount: count },
    });
  } catch (error: any) {
    console.error("Get unread count controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get unread count",
    });
  }
};

export const deleteMessageController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const messageId = parseInt(req.params.messageId || "");
    if (isNaN(messageId)) {
      res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
      return;
    }

    const result = await deleteMessage(messageId, user.userId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Delete message controller error:", error);
    const statusCode =
      error.message === "Message not found"
        ? 404
        : error.message.includes("only delete your own")
        ? 403
        : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete message",
    });
  }
};
