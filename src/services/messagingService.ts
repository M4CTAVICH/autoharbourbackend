import prisma from "../config/db.js";
import type {
  CreateMessageDTO,
  MessageResponse,
  ConversationResponse,
} from "../types/message.js";

export const sendMessage = async (
  senderId: number,
  messageData: CreateMessageDTO
): Promise<MessageResponse> => {
  try {
    if (!messageData.content?.trim()) {
      throw new Error("Message content is required");
    }

    const receiver = await prisma.user.findUnique({
      where: { id: messageData.receiverId },
    });
    if (!receiver) {
      throw new Error("Receiver not found");
    }

    if (senderId === messageData.receiverId) {
      throw new Error("Cannot send message to yourself");
    }

    if (messageData.listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: messageData.listingId },
      });
      if (!listing) {
        throw new Error("Listing not found");
      }
    }

    const message = await prisma.message.create({
      data: {
        content: messageData.content.trim(),
        senderId,
        receiverId: messageData.receiverId,
        listingId: messageData.listingId || null,
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

    return formatMessageResponse(message);
  } catch (error) {
    console.error("Send message error:", error);
    throw error;
  }
};
const formatMessageResponse = (message: any): MessageResponse => {
  return {
    id: message.id,
    content: message.content,
    isRead: message.isRead || false,
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
};
export const getUserConversations = async (
  userId: number
): Promise<ConversationResponse[]> => {
  try {
    const conversations = await prisma.$queryRaw`
      SELECT DISTINCT
        CASE 
          WHEN m.senderId = ${userId} THEN m.receiverId
          ELSE m.senderId
        END as participantId,
        u.name as participantName,
        u.avatar as participantAvatar,
        u.lastSeen as participantLastSeen,
        MAX(m.createdAt) as lastMessageTime
      FROM "Message" m
      JOIN "User" u ON (
        CASE 
          WHEN m.senderId = ${userId} THEN m.receiverId
          ELSE m.senderId
        END
      ) = u.id
      WHERE m.senderId = ${userId} OR m.receiverId = ${userId}
      GROUP BY participantId, u.name, u.avatar, u.lastSeen
      ORDER BY lastMessageTime DESC
    `;

    return (conversations as any[]).map((conv) => ({
      participant: {
        id: conv.participantid,
        name: conv.participantname,
        avatar: conv.participantavatar || undefined,
        lastSeen: conv.participantlastseen || undefined,
      },
    }));
  } catch (error) {
    console.error("Get user conversations error:", error);
    throw error;
  }
};

export const getMessagesBetweenUsers = async (
  userId: number,
  otherUserId: number,
  page: number = 1,
  limit: number = 50
): Promise<{
  messages: MessageResponse[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  try {
    const skip = (page - 1) * limit;

    const total = await prisma.message.count({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
    });

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
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

    return {
      messages: messages.map(formatMessageResponse),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Get messages between users error:", error);
    throw error;
  }
};

export const markMessagesAsRead = async (
  userId: number,
  fromUserId: number
): Promise<{ message: string; updatedCount: number }> => {
  try {
    const result = await prisma.message.updateMany({
      where: {
        senderId: fromUserId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return {
      message: "Messages marked as read",
      updatedCount: result.count,
    };
  } catch (error) {
    console.error("Mark messages as read error:", error);
    throw error;
  }
};

export const getUnreadMessageCount = async (
  userId: number
): Promise<number> => {
  try {
    const count = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    return count;
  } catch (error) {
    console.error("Get unread message count error:", error);
    return 0;
  }
};

export const deleteMessage = async (
  messageId: number,
  userId: number
): Promise<{ message: string }> => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error("Message not found");
    }

    if (message.senderId !== userId) {
      throw new Error("You can only delete your own messages");
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    return { message: "Message deleted successfully" };
  } catch (error) {
    console.error("Delete message error:", error);
    throw error;
  }
};
