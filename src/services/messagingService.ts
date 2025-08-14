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
    }
  } catch (error) {
    console.error("Send message error:", error);
    throw error;
  }
};
