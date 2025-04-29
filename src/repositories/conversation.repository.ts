import mongoose from "mongoose";
import conversations, { MessageInterface, conversationType } from "../models/conversations.model.ts";
import { UserRepository } from "./user.repository.ts";
import { CustomError } from "../utils/customError.utils.ts";

const userRepo = new UserRepository();

export class conversationRepository {
  async findConversationByUsers(userId1: string, userId2: string) {
    return conversations.findOne({
      $or: [
        { user1_id: userId1, user2_id: userId2 },
        { user1_id: userId2, user2_id: userId1 }
      ]
    }).populate('user1_id', 'user_id profile_photo bio')
      .populate('user2_id', 'user_id profile_photo bio');
  }

  async createConversation(userId1: string, userId2: string) {
    return conversations.create({
      user1_id: userId1,
      user2_id: userId2,
      user1_sent_messages: [],
      user2_sent_messages: []
    });
  } 

  async getConversation(conversationId: string) {
    const conversation = await conversations.findById(conversationId)
      .populate('user1_id', 'user_id profile_photo bio')
      .populate('user2_id', 'user_id profile_photo bio');
    
    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }
    return conversation;
  }



  async getUnseenCountForEachConversationBelongingToUser(userId: string) {
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

    // Return an array of unseen counts for each conversation with conversationId
    return unseenCounts.map((count, index) => ({
      conversationId: conversationsList[index]._id,
      unseenCount: count
    })); 
  }


  async addMessage(conversationId: string, senderId: string, message: string, media: string[] = [], mediaTypes: string[] = []) {
    const conversation = await conversations.findById(conversationId);
    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }

    const newMessage: MessageInterface = {
      sender_id: senderId,
      messageId: new mongoose.Types.ObjectId().toString(), // Generate a new message ID
      message,
      media,
      media_type: mediaTypes,
      timestamp: new Date(),
      reacted: '',
      is_seen: false
    };

    // Determine if sender is user1 or user2
    const isUser1 = conversation.user1_id.toString() === senderId;
    
    // Update the appropriate message array
    if (isUser1) {
      conversation.user1_sent_messages.push(newMessage);
      conversation.unread_count_user2 = (conversation.unread_count_user2 || 0) + 1;
    } else {
      conversation.user2_sent_messages.push(newMessage);
      conversation.unread_count_user1 = (conversation.unread_count_user1 || 0) + 1;
    }

    // Update last message info
    conversation.last_message_time = new Date();
    conversation.last_message_text = message;

    await conversation.save();
    return {conversation,messageId: newMessage.messageId};
  }

  async getUserConversations(userId: string) {
    return conversations.find({
      $or: [
        { user1_id: userId },
        { user2_id: userId }
      ]
    })
    .sort({ last_message_time: -1 })
    .populate('user1_id', 'user_id profile_photo bio')
    .populate('user2_id', 'user_id profile_photo bio');
  }

  async markConversationAsUnread(conversationId: string, userId: string) {
    const conversation = await conversations.findById(conversationId);
    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }

    // Determine if reader is user1 or user2
    const isUser1 = conversation.user1_id.toString() === userId;
    
    // Change user conversation type to unread
    if (isUser1 && !conversation.user1_conversation_type.includes(conversationType.unRead) ) {
      conversation.user1_conversation_type.push(conversationType.unRead)
      conversation.user1_conversation_type.filter(type => type !== conversationType.read); // Remove unread type
    } else if (!isUser1 && !conversation.user2_conversation_type.includes(conversationType.unRead)) {
      conversation.user2_conversation_type.push(conversationType.unRead);
      conversation.user2_conversation_type.filter(type => type !== conversationType.read); // Remove unread type
    }

    await conversation.save();
    console.log('Conversation marked as read for user 1:', conversation.user1_conversation_type, 'user 2:', conversation.user2_conversation_type);
    return conversation;
  }

  async markConversationAsRead(conversationId: string, userId: string) {
    const conversation = await conversations.findById(conversationId);
    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }

    // Determine if reader is user1 or user2
    const isUser1 = conversation.user1_id.toString() === userId;
    
    // Mark messages as read and reset unread count
    if (isUser1 && !conversation.user1_conversation_type.includes(conversationType.read)) {
      conversation.unread_count_user1 = 0;
      conversation.user2_sent_messages.forEach(msg => msg.is_seen = true);
      conversation.user1_conversation_type.push(conversationType.read);
      conversation.user1_conversation_type.filter(type => type !== conversationType.unRead); // Remove unread type
    } else if( !isUser1 && !conversation.user2_conversation_type.includes(conversationType.read)) {
      conversation.unread_count_user2 = 0;
      conversation.user1_sent_messages.forEach(msg => msg.is_seen = true);
      conversation.user2_conversation_type.push(conversationType.read);
      conversation.user2_conversation_type.filter(type => type !== conversationType.unRead); 
    }

    await conversation.save();
    console.log('Conversation marked as read for user 1:', conversation.user1_conversation_type, 'user 2:', conversation.user2_conversation_type);
    return conversation;
  }

  async markMessagesAsSeen(conversationId: string, userId: string) {
    const conversation = await conversations.findById(conversationId);
    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }

    // Determine if reader is user1 or user2
    const isUser1 = conversation.user1_id.toString() === userId;
    
    // Mark messages as seen
    if (isUser1) {
      conversation.user2_sent_messages.forEach(msg => msg.is_seen = true);
    } else {
      conversation.user1_sent_messages.forEach(msg => msg.is_seen = true);
    }

    await conversation.save();
    return conversation; 
  }


  async getUnseenMessagesCount(userId: string) {
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
  }
  async getConversationByUserId(userId: string) {
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
  }

  async getUnreadConversations(userId: string) {
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
  }

  async getAllConversations() {
    return conversations.find({}).populate('user1_id', 'user_id profile_photo bio')
      .populate('user2_id', 'user_id profile_photo bio');
  }

  async getConversationsByUserId(userId: string) {
    return conversations.find({ user1_id: userId }).populate('user1_id', 'user_id profile_photo bio')
      .populate('user2_id', 'user_id profile_photo bio');
  }

  async deleteConversationById(conversationId: string) {
    const conversation = await conversations.findByIdAndDelete(conversationId);
    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }
    return conversation;
  }

  async getTotalUnreadCount(userId: string) {
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
  }

  async reactToMessage(conversationId: string, messageId: string, userId: string, reaction: string) {
    const conversation = await conversations.findById(conversationId);
    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }
  
    console.log('messageId: ', messageId, 'userId: ', userId);
  
    // Search for the message in both user1_sent_messages and user2_sent_messages
    let message = conversation.user1_sent_messages.find(msg => msg.messageId.toString() === messageId);
    if (!message) {
      message = conversation.user2_sent_messages.find(msg => msg.messageId.toString() === messageId);
    }
  
    console.log('Found message: ', message);
  
    if (!message) {
      throw new CustomError('Message not found', 404);
    }
  
    // Update the reaction
    message.reacted = reaction;
  
    await conversation.save();
    return conversation;
  }

  async removeReaction(conversationId: string, messageId: string, userId: string) {
    const conversation = await conversations.findById(conversationId);
    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }

    
    // Search for the message in both user1_sent_messages and user2_sent_messages
    let message = conversation.user1_sent_messages.find(msg => msg.messageId.toString() === messageId);
    if (!message) {
      message = conversation.user2_sent_messages.find(msg => msg.messageId.toString() === messageId);
    }
  
    if (!message) {
      throw new CustomError('Message not found', 404);
    }
  
    // Remove the reaction
    message.reacted = '';
  
    await conversation.save();
    return conversation;

  }

  async deleteConversation(conversationId: string) {
    const conversation = await conversations.findByIdAndDelete(conversationId);
    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }
    return conversation;
  }
  
  async deleteMessage(conversationId: string, messageId: string, userId: string) {
    const conversation = await conversations.findById(conversationId);
    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }

    // Determine if user is user1 or user2
    const isUser1 = conversation.user1_id.toString() === userId;
    
    // Find and remove the message from the appropriate array
    const messageArray = isUser1 ? conversation.user1_sent_messages : conversation.user2_sent_messages;
    const messageIndex = messageArray.findIndex(msg => msg.messageId.toString() === messageId);
    
    if (messageIndex === -1) {
      throw new CustomError('Message not found', 404);
    }

    messageArray.splice(messageIndex, 1);
    
    await conversation.save();
    return conversation;
  }

  async editMessage(conversationId: string, messageId: string, userId: string, newMessage: string) {
    const conversation = await conversations.findById(conversationId);
    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }

    // Determine if user is user1 or user2
    const isUser1 = conversation.user1_id.toString() === userId;
    
    // Find the message in the appropriate array
    const messageArray = isUser1 ? conversation.user1_sent_messages : conversation.user2_sent_messages;
    const message = messageArray.find(msg => msg.messageId.toString() === messageId);
    
    if (!message) {
      throw new CustomError('Message not found', 404);
    }

    message.message = newMessage;
    message.is_edited = true; // Initialize isEdited if it doesn't exist

    await conversation.save();
    return conversation;
  }


  // async blockUser(userId: string, blockedUserId: string) {
  //   const conversation = await this.findConversationByUsers(userId, blockedUserId);
  //   const blockedUser = await userRepo.findByUserId(blockedUserId);
  //   const user = await userRepo.findByUserId(userId);
    
  //   if (!conversation) {
  //     throw new CustomError('Conversation not found', 404);
  //   }

  //   if (!blockedUser) {
  //     throw new CustomError('User to block not found', 404);
  //   }
    
  //   if (!user) {
  //     throw new CustomError('User not found', 404);
  //   }

  //   if (!user.blocked) {
  //     user.blocked = [];
  //   }

  //   if (user.blocked.includes(blockedUserId)) {
  //     throw new CustomError('User already blocked', 400);
  //   }

  //   if (user.blocked.length >= 100) {
  //     throw new CustomError('User block limit reached', 400);
  //   }
  //   // Add to blocked list
  //   user.blockUser(blockedUserId);
  //   await user.save();

  //   // Determine if blocker is user1 or user2
  //   const isUser1 = conversation.user1_id.toString() === userId;
    
  //   if (isUser1) {
  //     conversation.is_blocked_by_user1 = true;
  //   } else {
  //     conversation.is_blocked_by_user2 = true;
  //   }

  //   await conversation.save();
  //   return conversation;
  // }

  // async unblockUser(userId: string, blockedUserId: string) {
  //   const conversation = await this.findConversationByUsers(userId, blockedUserId);
    
  //   if (!conversation) {
  //     throw new CustomError('Conversation not found', 404);
  //   }

  //   // Determine if unblocker is user1 or user2
  //   const isUser1 = conversation.user1_id.toString() === userId;
    
  //   if (isUser1) {
  //     conversation.is_blocked_by_user1 = false;
  //   } else {
  //     conversation.is_blocked_by_user2 = false;
  //   }

  //   await conversation.save();
  //   return conversation;
  // }

}