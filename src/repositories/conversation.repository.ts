import mongoose from "mongoose";
import conversations, { MessageInterface, conversationType } from "../models/conversations.model.ts";
import { UserRepository } from "./user.repository.ts";
import { CustomError } from "../utils/customError.utils.ts";

const userRepo = new UserRepository();

export class conversationRepository {
  async findConversationByUsers(userId1: string, userId2: string) {
    try {
      return conversations.findOne({
        $or: [
          { user1_id: userId1, user2_id: userId2 },
          { user1_id: userId2, user2_id: userId1 }
        ]
      }).populate('user1_id', 'user_id profile_photo bio')
        .populate('user2_id', 'user_id profile_photo bio');
    } catch (error) {
      throw new CustomError('Error finding conversation by users', 500);
    }
  }

  async createConversation(userId1: string, userId2: string) {
    try {
      return conversations.create({
        user1_id: userId1,
        user2_id: userId2,
        user1_sent_messages: [],
        user2_sent_messages: []
      });
    } catch (error) {
      throw new CustomError('Error creating conversation', 500);
    }
  }

  async getConversation(conversationId: string) {
    try {
      const conversation = await conversations.findById(conversationId)
        .populate('user1_id', 'user_id profile_photo bio')
        .populate('user2_id', 'user_id profile_photo bio');

      if (!conversation) {
        throw new CustomError('Conversation not found', 404);
      }

      const user1 = await userRepo.findByUserId(conversation.user1_id.toString());
      const user2 = await userRepo.findByUserId(conversation.user2_id.toString());

      if (!user1 || !user2) {
        throw new CustomError('User not found', 404);
      }

      if (user1.blocked.some(blockedUser => blockedUser._id.toString() === user2.id) ||
          user2.blocked.some(blockedUser => blockedUser._id.toString() === user1.id)) {
        throw new CustomError('Conversation is blocked', 403);
      }

      return conversation;
    } catch (error) {
      throw new CustomError('Error retrieving conversation', 500);
    }
  }

  async getUnseenCountForEachConversationBelongingToUser(userId: string) {
    try {
      const conversationsList = await conversations.find({
        $or: [
          { user1_id: userId },
          { user2_id: userId }
        ]
      });

      const unseenCounts = conversationsList.map(conv => {
        if (conv.user1_id.toString() === userId) {
          return conv.unread_count_user1 || 0;
        } else {
          return conv.unread_count_user2 || 0;
        }
      });

      return unseenCounts.map((count, index) => ({
        conversationId: conversationsList[index]._id,
        unseenCount: count
      }));
    } catch (error) {
      throw new CustomError('Error retrieving unseen counts for conversations', 500);
    }
  }

  async addMessage(conversationId: string, senderId: string, message: string, media: string[] = [], mediaTypes: string[] = []) {
    try {
      const conversation = await conversations.findById(conversationId);
      if (!conversation) {
        throw new CustomError('Conversation not found', 404);
      }

      const newMessage: MessageInterface = {
        sender_id: senderId,
        messageId: new mongoose.Types.ObjectId().toString(),
        message,
        media,
        media_type: mediaTypes,
        timestamp: new Date(),
        reacted: '',
        is_seen: false
      };

      const isUser1 = conversation.user1_id.toString() === senderId;

      if (isUser1) {
        conversation.user1_sent_messages.push(newMessage);
        conversation.unread_count_user2 = (conversation.unread_count_user2 || 0) + 1;
      } else {
        conversation.user2_sent_messages.push(newMessage);
        conversation.unread_count_user1 = (conversation.unread_count_user1 || 0) + 1;
      }

      conversation.last_message_time = new Date();
      conversation.last_message_text = message;

      await conversation.save();
      return { conversation, messageId: newMessage.messageId };
    } catch (error) {
      throw new CustomError('Error adding message to conversation', 500);
    }
  }

  async getUserConversations(userId: string) {
    try {
      return conversations.find({
        $or: [
          { user1_id: userId },
          { user2_id: userId }
        ]
      })
        .sort({ last_message_time: -1 })
        .populate('user1_id', 'user_id profile_photo bio')
        .populate('user2_id', 'user_id profile_photo bio');
    } catch (error) {
      throw new CustomError('Error retrieving user conversations', 500);
    }
  }

  async markConversationAsUnread(conversationId: string, userId: string) {
    try {
      const conversation = await conversations.findById(conversationId);
      if (!conversation) {
        throw new CustomError('Conversation not found', 404);
      }

      const isUser1 = conversation.user1_id.toString() === userId;

      if (isUser1 && !conversation.user1_conversation_type.includes(conversationType.unRead)) {
        conversation.user1_conversation_type.push(conversationType.unRead);
        conversation.user1_conversation_type = conversation.user1_conversation_type.filter(type => type !== conversationType.read);
      } else if (!isUser1 && !conversation.user2_conversation_type.includes(conversationType.unRead)) {
        conversation.user2_conversation_type.push(conversationType.unRead);
        conversation.user2_conversation_type = conversation.user2_conversation_type.filter(type => type !== conversationType.read);
      }

      await conversation.save();
      console.log('Conversation marked as unread for user 1:', conversation.user1_conversation_type, 'user 2:', conversation.user2_conversation_type);
      return conversation;
    } catch (error) {
      throw new CustomError('Error marking conversation as unread', 500);
    }
  }

  async markConversationAsRead(conversationId: string, userId: string) {
    try {
      const conversation = await conversations.findById(conversationId);
      if (!conversation) {
        throw new CustomError('Conversation not found', 404);
      }

      const isUser1 = conversation.user1_id.toString() === userId;

      if (isUser1 && !conversation.user1_conversation_type.includes(conversationType.read)) {
        conversation.unread_count_user1 = 0;
        conversation.user2_sent_messages.forEach(msg => msg.is_seen = true);
        conversation.user1_conversation_type.push(conversationType.read);
        conversation.user1_conversation_type = conversation.user1_conversation_type.filter(type => type !== conversationType.unRead);
      } else if (!isUser1 && !conversation.user2_conversation_type.includes(conversationType.read)) {
        conversation.unread_count_user2 = 0;
        conversation.user1_sent_messages.forEach(msg => msg.is_seen = true);
        conversation.user2_conversation_type.push(conversationType.read);
        conversation.user2_conversation_type = conversation.user2_conversation_type.filter(type => type !== conversationType.unRead);
      }

      await conversation.save();
      console.log('Conversation marked as read for user 1:', conversation.user1_conversation_type, 'user 2:', conversation.user2_conversation_type);
      return conversation;
    } catch (error) {
      throw new CustomError('Error marking conversation as read', 500);
    }
  }

  async markMessagesAsSeen(conversationId: string, userId: string) {
    try {
      const conversation = await conversations.findById(conversationId);
      if (!conversation) {
        throw new CustomError('Conversation not found', 404);
      }

      const isUser1 = conversation.user1_id.toString() === userId;

      if (isUser1) {
        conversation.user2_sent_messages.forEach(msg => msg.is_seen = true);
      } else {
        conversation.user1_sent_messages.forEach(msg => msg.is_seen = true);
      }

      await conversation.save();
      return conversation;
    } catch (error) {
      throw new CustomError('Error marking messages as seen', 500);
    }
  }

  async getUnseenMessagesCount(userId: string) {
    try {
      const conversationsList = await conversations.find({
        $or: [
          { user1_id: userId },
          { user2_id: userId }
        ]
      });

      let unseenCount = 0;

      conversationsList.forEach(conv => {
        if (conv.user1_id.toString() === userId) {
          unseenCount += conv.unread_count_user1 || 0;
        } else {
          unseenCount += conv.unread_count_user2 || 0;
        }
      });
      return unseenCount;
    } catch (error) {
      throw new CustomError('Error retrieving unseen messages count', 500);
    }
  }

  async getConversationByUserId(userId: string) {
    try {
      const conversation = await conversations.findOne({
        $or: [
          { user1_id: userId },
          { user2_id: userId }
        ]
      }).populate('user1_id', 'user_id profile_photo bio')
        .populate('user2_id', 'user_id profile_photo bio');

      if (!conversation) {
        throw new CustomError('Conversation not found', 404);
      }
      return conversation;
    } catch (error) {
      throw new CustomError('Error retrieving conversation by user ID', 500);
    }
  }

  async getUnreadConversations(userId: string) {
    try {
      const conversationsList = await conversations.find({
        $or: [
          { user1_id: userId },
          { user2_id: userId }
        ]
      }).populate('user1_id', 'user_id profile_photo bio')
        .populate('user2_id', 'user_id profile_photo bio');

      const unreadConversations = conversationsList.filter(conv => {
        if (conv.user1_id.toString() === userId) {
          return conv.unread_count_user1 > 0;
        } else {
          return conv.unread_count_user2 > 0;
        }
      });

      return unreadConversations;
    } catch (error) {
      throw new CustomError('Error retrieving unread conversations', 500);
    }
  }

  async getAllConversations() {
    try {
      return conversations.find({}).populate('user1_id', 'user_id profile_photo bio')
        .populate('user2_id', 'user_id profile_photo bio');
    } catch (error) {
      throw new CustomError('Error retrieving all conversations', 500);
    }
  }

  async getConversationsByUserId(userId: string) {
    try {
      return conversations.find({ user1_id: userId }).populate('user1_id', 'user_id profile_photo bio')
        .populate('user2_id', 'user_id profile_photo bio');
    } catch (error) {
      throw new CustomError('Error retrieving conversations by user ID', 500);
    }
  }

  async deleteConversationById(conversationId: string) {
    try {
      const conversation = await conversations.findByIdAndDelete(conversationId);
      if (!conversation) {
        throw new CustomError('Conversation not found', 404);
      }
      return conversation;
    } catch (error) {
      throw new CustomError('Error deleting conversation by ID', 500);
    }
  }

  async getTotalUnreadCount(userId: string) {
    try {
      const userConversations = await conversations.find({
        $or: [
          { user1_id: userId },
          { user2_id: userId }
        ]
      });

      let totalUnread = 0;

      userConversations.forEach(conv => {
        if (conv.user1_id.toString() === userId) {
          totalUnread += conv.unread_count_user1 || 0;
        } else {
          totalUnread += conv.unread_count_user2 || 0;
        }
      });
      return totalUnread;
    } catch (error) {
      throw new CustomError('Error retrieving total unread count', 500);
    }
  }

  async reactToMessage(conversationId: string, messageId: string, userId: string, reaction: string) {
    try {
      const conversation = await conversations.findById(conversationId);
      if (!conversation) {
        throw new CustomError('Conversation not found', 404);
      }

      let message = conversation.user1_sent_messages.find(msg => msg.messageId.toString() === messageId);
      if (!message) {
        message = conversation.user2_sent_messages.find(msg => msg.messageId.toString() === messageId);
      }

      if (!message) {
        throw new CustomError('Message not found', 404);
      }

      message.reacted = reaction;

      await conversation.save();
      return conversation;
    } catch (error) {
      throw new CustomError('Error reacting to message', 500);
    }
  }

  async removeReaction(conversationId: string, messageId: string, userId: string) {
    try {
      const conversation = await conversations.findById(conversationId);
      if (!conversation) {
        throw new CustomError('Conversation not found', 404);
      }

      let message = conversation.user1_sent_messages.find(msg => msg.messageId.toString() === messageId);
      if (!message) {
        message = conversation.user2_sent_messages.find(msg => msg.messageId.toString() === messageId);
      }

      if (!message) {
        throw new CustomError('Message not found', 404);
      }

      message.reacted = '';

      await conversation.save();
      return conversation;
    } catch (error) {
      throw new CustomError('Error removing reaction from message', 500);
    }
  }

  async deleteConversation(conversationId: string) {
    try {
      const conversation = await conversations.findByIdAndDelete(conversationId);
      if (!conversation) {
        throw new CustomError('Conversation not found', 404);
      }
      return conversation;
    } catch (error) {
      throw new CustomError('Error deleting conversation', 500);
    }
  }

  async deleteMessage(conversationId: string, messageId: string, userId: string) {
    try {
      const conversation = await conversations.findById(conversationId);
      if (!conversation) {
        throw new CustomError('Conversation not found', 404);
      }

      const isUser1 = conversation.user1_id.toString() === userId;

      const messageArray = isUser1 ? conversation.user1_sent_messages : conversation.user2_sent_messages;
      const messageIndex = messageArray.findIndex(msg => msg.messageId.toString() === messageId);

      if (messageIndex === -1) {
        throw new CustomError('Message not found', 404);
      }

      messageArray.splice(messageIndex, 1);

      await conversation.save();
      return conversation;
    } catch (error) {
      throw new CustomError('Error deleting message', 500);
    }
  }

  async editMessage(conversationId: string, messageId: string, userId: string, newMessage: string) {
    try {
      const conversation = await conversations.findById(conversationId);
      if (!conversation) {
        throw new CustomError('Conversation not found', 404);
      }

      const isUser1 = conversation.user1_id.toString() === userId;

      const messageArray = isUser1 ? conversation.user1_sent_messages : conversation.user2_sent_messages;
      const message = messageArray.find(msg => msg.messageId.toString() === messageId);

      if (!message) {
        throw new CustomError('Message not found', 404);
      }

      message.message = newMessage;
      message.is_edited = true;

      await conversation.save();
      return conversation;
    } catch (error) {
      throw new CustomError('Error editing message', 500);
    }
  }
}