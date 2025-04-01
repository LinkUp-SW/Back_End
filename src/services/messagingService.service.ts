import { conversationRepository } from "../repositories/conversation.repository.ts";
import { UserRepository } from "../repositories/user.repository.ts";
import { CustomError } from "../utils/customError.utils.ts";

export class MessageService {
  private conversationRepository: conversationRepository;
  private userRepository: UserRepository;

  constructor() {
    this.conversationRepository = new conversationRepository();
    this.userRepository = new UserRepository();
  }

  async sendMessage(senderId: string, receiverId: string, message: string, media: string[] = [], mediaTypes: string[] = []) {
    // Check if users exist
    const sender = await this.userRepository.findByUserId(senderId);
    const receiver = await this.userRepository.findByUserId(receiverId);
    
    if (!sender || !receiver) {
      throw new CustomError('User not found', 404);
    }

    // Check if the sender is blocked by the receiver
    if (receiver.blocked && receiver.blocked.includes(senderId)) {
      throw new CustomError('You cannot send messages to this user', 403);
    }

    // Find or create conversation
    let conversation = await this.conversationRepository.findConversationByUsers(senderId, receiverId);
    
    if (!conversation) {
      conversation = await this.conversationRepository.createConversation(senderId, receiverId);
    }

    // Check if there's a block in place
    const senderIsUser1 = conversation.user1_id.toString() === senderId;
    if ((senderIsUser1 && conversation.is_blocked_by_user2) || 
        (!senderIsUser1 && conversation.is_blocked_by_user1)) {
      throw new CustomError('You cannot send messages to this user', 403);
    }

    // Add message to conversation
    return await this.conversationRepository.addMessage(conversation._id as string, senderId, receiverId, message, media, mediaTypes);
  }

  async getConversations(userId: string) {
    const user = await this.userRepository.findByUserId(userId);
    
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    const conversations = await this.conversationRepository.getUserConversations(userId);
    
    // Format conversations to include other user's details and unread count
    return conversations.map(conv => {
      const isUser1 = conv.user1_id.toString() === userId;
      const otherUser = isUser1 ? conv.user2_id : conv.user1_id;
      const unreadCount = isUser1 ? conv.unread_count_user1 : conv.unread_count_user2;
      const isBlocked = isUser1 ? conv.is_blocked_by_user1 : conv.is_blocked_by_user2;
      const isBlockedBy = isUser1 ? conv.is_blocked_by_user2 : conv.is_blocked_by_user1;
      
      return {
        conversationId: conv._id,
        otherUser: otherUser,
        lastMessage: conv.last_message_text,
        lastMessageTime: conv.last_message_time,
        unreadCount: unreadCount,
        isBlocked: isBlocked,
        isBlockedBy: isBlockedBy
      };
    });
  }

  async getConversationById(conversationId: string, userId: string) {
    const conversation = await this.conversationRepository.findConversationById(conversationId);

    // Check if the user is part of the conversation
    if (conversation.user1_id.toString() !== userId && 
        conversation.user2_id.toString() !== userId) {
      throw new CustomError('Unauthorized access to conversation', 403);
    }

    return conversation;
  }

  async markAsRead(conversationId: string, userId: string) {
    return await this.conversationRepository.markConversationAsRead(conversationId, userId);
  }

  // async blockUser(userId: string, blockedUserId: string) {
  //   // Update user's blocked list
  //   const user = await this.userRepository.findByUserId(userId);
  //   if (!user) {
  //     throw new CustomError('User not found', 404);
  //   }

  //   if (!user.blocked) {
  //     user.blocked = [];
  //   }

  //   if (!user.blocked.includes(blockedUserId)) {
  //     user.blocked.push(blockedUserId);
  //     await user.save();
  //   }
    
  //   // Update conversation block status
  //   return await this.conversationRepository.blockUser(userId, blockedUserId);
  // }

  // async unblockUser(userId: string, blockedUserId: string) {
  //   // Update user's blocked list
  //   const user = await this.userRepository.findByUserId(userId);
  //   if (!user) {
  //     throw new CustomError('User not found', 404);
  //   }

  //   if (user.blocked && user.blocked.includes(blockedUserId)) {
  //     user.blocked = user.blocked.filter(id => id !== blockedUserId);
  //     await user.save();
  //   }
    
  //   // Update conversation block status
  //   return await this.conversationRepository.unblockUser(userId, blockedUserId);
  // }
  
  async getUnreadCount(userId: string) {
    return await this.conversationRepository.getTotalUnreadCount(userId);
  }
}