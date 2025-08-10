export interface CreateMessageDTO {
  content: string;
  receiverId: number;
  listingId?: number;
}

export interface MessageResponse {
  id: number;
  content: string;
  isRead: boolean;
  listingId?: number;
  createdAt: Date;
  sender: {
    id: number;
    name: string;
    avatar?: string;
  };
  receiver: {
    id: number;
    name: string;
    avatar?: string;
  };
}

export interface ConversationResponse {
  participant: {
    id: number;
    name: string;
    avatar?: string;
    lastSeen?: Date;
  };
  lastMessage: {
    content: string;
    createdAt: Date;
    isRead: boolean;
  };
  unreadCount: number;
  listing?: {
    id: number;
    title: string;
    images: string[];
  };
}
