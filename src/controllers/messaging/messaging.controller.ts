import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../../middleware/asyncHandler.ts';
import { CustomError } from '../../utils/customError.utils.ts';
import { conversationRepository } from '../../repositories/conversation.repository.ts';
import { UserRepository } from '../../repositories/user.repository.ts';
import mongoose from 'mongoose';
import { exists } from 'fs';

const conversationRepo = new conversationRepository();
const userRepo = new UserRepository();

/**
 * Start a new conversation between two users
 *  
 * @route POST /api/v1/messages/conversations
 * @access Private - Requires authentication
 * @param {Request} req - Express request object with user1Id and user2ID in body
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<Response>} JSON response with conversationId
 * 
 * @throws {CustomError} 401 - If user is not authenticated
 * @throws {CustomError} 400 - If user1Id or user2ID is missing
 * @throws {CustomError} 404 - If user1 or user2 is not found
 * @throws {CustomError} 500 - If conversation creation fails
 * */
const startConversation = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const user1Id  = req.user
  const { user2ID } = req.params;
  const {firstMessage,media, mediaTypes} = req.body;
  console.log('user1Id:', user1Id, 'user2ID:', user2ID);

  if (!user1Id) {
    throw new CustomError('User not authenticated', 401);
  }

  if (!user2ID) {
    throw new CustomError('User ID is required', 400);
  }

  // Check if user2 exists
  const user2 = await userRepo.findByUserId(user2ID);
  if (!user2) {
    throw new CustomError('User not found', 404);
  }

  // Check if user1 exists
  const user1 = await userRepo.findByUserId(user1Id as string);
  if (!user1) {
    throw new CustomError('User not found', 404);
  }

  // Check if the sender is blocked by the receiver
  if (user2.blocked && user2.blocked.includes(user1.id)) {
    throw new CustomError('You cannot send messages to this user', 403);
  } // Check if the receiver is blocked by the sender

  const conversation = await conversationRepo.findConversationByUsers(user1Id as string, user2ID);
  if (conversation) {
    // Conversation already exists --> add the message to it
    if (firstMessage) {
      await conversationRepo.addMessage(conversation._id, user1Id as string, firstMessage, media, mediaTypes);
    }
    return res.status(200).json({ conversationId: conversation._id, conversationExists: true, message: firstMessage});
  } else {
    const newConversation = await conversationRepo.createConversation(user1Id as string , user2ID);
    if (!newConversation) {
      throw new CustomError('Failed to create conversation', 500);
    }
    // Add the first message to the conversation
    if (firstMessage) {
      await conversationRepo.addMessage(newConversation._id, user1Id as string, firstMessage, media, mediaTypes);
    }
    return res.status(201).json({ conversationId: newConversation._id });
  }
});


/**
  * Check if a conversation exists between two users
  * 
  * @route GET /api/v1/messages/conversations/check-conversation/:user2ID
  * @access Private - Requires authentication
  * @param {Request} req - Express request object with user2ID in params
  * @param {Response} res - Express response object
  * @param {NextFunction} next - Express next middleware function
  * @returns {Promise<Response>} JSON response with conversationId and conversationExists flag
  * @throws {CustomError} 401 - If user is not authenticated
  * @throws {CustomError} 400 - If user2ID is missing
  * @throws {CustomError} 404 - If user2 is not found
  */

const checkConversationExists = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const user1Id = req.user
  const { user2ID } = req.params;
  
  if (!user1Id) {
    throw new CustomError('User not authenticated', 401);
  }
  
  if (!user2ID) {
    throw new CustomError('User ID is required', 400);
  }
  
  // Check if user1 exists
  const user1 = await userRepo.findByUserId(user1Id as string);
  if (!user1) {
    throw new CustomError('User not found', 404);
  }
  // Check if user2 exists
  const user2 = await userRepo.findByUserId(user2ID);
  if (!user2) {
    throw new CustomError('User2 not found', 404);
  }
  
  // Check if the sender is blocked by the receiver
  if (user2.blocked && user2.blocked.includes(user1.id)) {
    throw new CustomError('You cannot send messages to this user', 403);
  } // Check if the receiver is blocked by the sender

  // Check if conversation exists
  const conversation = await conversationRepo.findConversationByUsers(user1Id as string, user2ID);
  if (!conversation) {
    return res.status(200).json({ conversationExists: false });
  }
  return res.status(200).json({ conversationExists: true });
});

/**
 * Get all conversations for the logged-in user
 * 
 * @route GET /api/v1/messages/conversations
 * @access Private - Requires authentication
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<Response>} JSON response with formatted conversations
 * @throws {CustomError} 401 - If user is not authenticated
 */
const getConversations = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  let userId = req.user;
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  // Find all conversations where the user is a participant using repository
  const conversations = await conversationRepo.getUserConversations(userId as string);
  
  // Ensure conversations is an array
  const conversationsArray = Array.isArray(conversations) ? conversations : [conversations].filter(Boolean);
  
  let totalConversationUnreadCount = 0;
  // Format the conversations to include only relevant information
  const formattedConversationsPromises = conversationsArray.map(async conversation => {
    // Determine if the user is user1 or user2
    const isUser1 = conversation.user1_id.toString() === userId.toString();
    const user2 = isUser1 ? conversation.user2_id : conversation.user1_id; 
    
    console.log('user2:', user2);

    const otherUser = await userRepo.findByUserId(user2);

    if (!otherUser) { // Check if other user exists
      console.error(`User not found for user2 ID: ${user2}`);
      throw new CustomError('User not found', 404); 
    }

    if (isUser1) {
      // Check if the user is blocked by user2
      if (conversation.is_blocked_by_user2) {
        throw new CustomError('You cannot send messages to this user', 403);
      }

      if (conversation.user1_conversation_type.includes('Unread')) {
        totalConversationUnreadCount += 1
      }

    } else {
      // Check if the user is blocked by user1
      if (conversation.is_blocked_by_user1) {
        throw new CustomError('You cannot send messages to this user', 403);
      }

      if (conversation.user2_conversation_type.includes('Unread')) {
        totalConversationUnreadCount += 1
      }
    }

    // Get last message and unread count
    const sentMessages = isUser1 ? conversation.user1_sent_messages : conversation.user2_sent_messages;
    const receivedMessages = isUser1 ? conversation.user2_sent_messages : conversation.user1_sent_messages;
    
    // Combine and sort all messages by timestamp
    const allMessages = [...sentMessages, ...receivedMessages].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    const lastMessage = allMessages.length > 0 ? allMessages[0] : '';

    // console.log('Recieved:', receivedMessages);
    
    const unreadCount: number = receivedMessages.filter((msg) => !msg.is_seen).length;
    console.log('unreadCount:', unreadCount);
    return {
      conversationId: conversation._id,
      conversationType: isUser1 ? conversation.user1_conversation_type : conversation.user2_conversation_type,
      otherUser: {
        userId: otherUser.user_id,
        firstName: otherUser.bio?.first_name || '',
        lastName: otherUser.bio?.last_name || '',
        profilePhoto: otherUser.profile_photo || '',
        onlineStatus: otherUser.online_status || false,
      },
      lastMessage: lastMessage ? {
        message: lastMessage.message,
        timestamp: lastMessage.timestamp,
        isOwnMessage: (isUser1 && sentMessages.includes(lastMessage)) || 
                      (!isUser1 && receivedMessages.includes(lastMessage))
      } : '',
      
      unreadCount
    };
  });

  

  const formattedConversations = await Promise.all(formattedConversationsPromises);
  
  // Calculate total unread count by summing up unreadCount from all conversations
  
  
  return res.status(200).json({ 
    conversations: formattedConversations,
    conversationUnreadCount: totalConversationUnreadCount
  });
});

/**
 * Get a single conversation by ID with complete message history
 * 
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<Response>} JSON response with conversation details and messages
 * @throws {CustomError} 401 - If user is not authenticated
 * @throws {CustomError} 400 - If conversation ID is invalid
 * @throws {CustomError} 404 - If conversation is not found
 * @throws {CustomError} 403 - If user does not have access to the conversation
 */
const getConversation = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user
  const { conversationId } = req.params;
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new CustomError('Invalid conversation ID', 400);
  }
  
  // Use repository instead of direct DB access
  const conversation = await conversationRepo.getConversation(conversationId);
  
  // Verify the user is part of this conversation
  const isUser1 = conversation.user1_id === userId  as string;
  const isUser2 = conversation.user2_id === userId  as string;
  
  if (!isUser1 && !isUser2) {
    throw new CustomError('You do not have access to this conversation', 403);
  }
  
  // Combine and sort messages for display
  const allMessages = [];
  const user1 = await userRepo.findByUserId(conversation.user1_id);
  const user2 = await userRepo.findByUserId(conversation.user2_id);

  if (!user1 || !user2) {
    throw new CustomError('User not found', 404);
  }


  for (const msg of conversation.user1_sent_messages) { //user1: Hamza / user2: Ali
    allMessages.push({
      senderId: user1.user_id,
      senderName: `${user1.bio?.first_name || ''} ${user1.bio?.last_name || ''}`,
      message: msg.message,
      media: msg.media || [],
      timestamp: msg.timestamp,
      reacted: msg.reacted,
      isSeen: isUser2 ? true : msg.is_seen, // user2 sees all messages of user1 when opening conversation
      isOwnMessage: isUser1,
      messageId: msg.messageId,
      isEdited: msg.is_edited , 
    });
  }
  
  for (const msg of conversation.user2_sent_messages) {
    allMessages.push({
      senderId: user2.user_id,
      senderName: `${user2.bio?.first_name || ''} ${user2.bio?.last_name || ''}`,
      message: msg.message,
      media: msg.media || [],
      timestamp: msg.timestamp,
      reacted: msg.reacted,
      isSeen: isUser1? true : msg.is_seen, // user1 sees all messages of user2 when opening conversation
      isOwnMessage: isUser2,
      messageId: msg.messageId,
      isEdited: msg.is_edited ,
    });
  }

  //Update conversation unread count
  if (isUser1) {
    conversation.unread_count_user2 = 0; // Reset unread count for user2
  } else {
    conversation.unread_count_user1 = 0; // Reset unread count for user1
  }
  
  // Sort messages by timestamp (newest first)
  allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  const otherUser = await userRepo.findByUserId(isUser1 ? conversation.user2_id : conversation.user1_id) ;
  
  if (!otherUser) {
    throw new CustomError('User not found', 404);
  }

  // Check if the user is blocked by the other user
  if (isUser1 && conversation.is_blocked_by_user2) {
    throw new CustomError('You cannot send messages to this user', 403);
  } else if (isUser2 && conversation.is_blocked_by_user1) {
    throw new CustomError('You cannot send messages to this user', 403);
  }

  // Check if the other user is blocked by the current user
  if (isUser1 && conversation.is_blocked_by_user1) {
    throw new CustomError('You cannot send messages to this user', 403);
  } else if (isUser2 && conversation.is_blocked_by_user2) {
    throw new CustomError('You cannot send messages to this user', 403);
  }

  // Mark messages as seen for the other user
  if (isUser1) {
    conversation.user2_sent_messages.forEach((msg) => {
      msg.is_seen = true;
    });
    conversation.unread_count_user2 = 0; // Reset unread count for user2
  } else {
    conversation.user1_sent_messages.forEach((msg) => {
      msg.is_seen = true;
    });
    conversation.unread_count_user1 = 0; // Reset unread count for user1
  }




  await conversation.save();

  return res.status(200).json({
    conversationId: conversation._id,
    otherUser: {
      userId: otherUser.user_id,
      firstName: otherUser.bio?.first_name || '',
      lastName: otherUser.bio?.last_name || '',
      profilePhoto: otherUser.profile_photo || ''
    },
    messages: allMessages

  });
});

/**
 * Get count of unseen messages across all conversations
 * 
 * @route GET /api/v1/messages/unseen-count
 * @access Private - Requires authentication
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<Response>} JSON with unseenCount
 * @throws {CustomError} 401 - If user is not authenticated
 */
const getUnseenMessagesCount = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  // Use repository method to get total unread count
  const unseenCount = await conversationRepo.getTotalUnreadCount(userId as string);
  
  return res.status(200).json({ unseenCount });
});

/**
 * Get count of unseen messages for each conversation and return the conversation IDs/otheruser fname and lname + profile photo + last message
 * 
 * @route GET /api/v1/messages/unseen-count/conversations
 * @access Private - Requires authentication
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @param {string} userId - ID of the user
 * 
 * @returns {Promise<Response>} JSON with unseenCount and conversation details
 * @throws {CustomError} 401 - If user is not authenticated
 * @throws {CustomError} 400 - If userId is invalid
 * @throws {CustomError} 404 - If user is not found
 * * @throws {CustomError} 500 - If fetching unseen count fails
 * * @description Fetches the count of unseen messages for each conversation and returns the conversation IDs, other user details, and last message.
 * 
 */

export  interface  UnseenCountByConversation {
  conversationId: string;
  otherUser: {
    userId: string;
    firstName: string;
    lastName: string;
    profilePhoto: string;
  };
  lastMessage: {
    message: string;
    timestamp: Date | string;
    isOwnMessage: boolean;
  } | '';
  unreadCount: number;
}

/**
 * Get unseen messages count for each conversation of user
 * 
 * * @route GET /api/v1/messages/unseen-count/conversations
 * * @access Private - Requires authentication
 * * @param {Request} req - Express request object
 * * @param {Response} res - Express response object
 * * @param {NextFunction} next - Express next middleware function
 * * * @returns {Promise<Response>} JSON with unseenCount and conversation details
 * * * @throws {CustomError} 401 - If user is not authenticated
 * * * @throws {CustomError} 400 - If userId is invalid
 * * * @throws {CustomError} 404 - If user is not found
 * * * @throws {CustomError} 500 - If fetching unseen count fails
 * * * @description Fetches the count of unseen messages for each conversation and returns the conversation IDs, other user details, and last message.
 */

const getUnseenMessagesCountByConversation = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  // Use repository method to get unseen count by conversation
  const unseenCountByConversation = await conversationRepo.getUnseenCountForEachConversationBelongingToUser(userId as string);
  
  // Create an array of promises for each conversation
  const conversationPromises = unseenCountByConversation.map(async (conversation) => {
    // Find conversation details
    if (!conversation) {
      throw new CustomError('Conversation not found', 404);
    }
    // Get conversation from conversationid
    const convo = await conversationRepo.getConversation(conversation.conversationId);
    if (!convo) {
      throw new CustomError('Conversation not found', 404);
    }
    // Determine if the user is user1 or user2
    const isUser1 = convo.user1_id.toString() === userId.toString();
    const otherUserId = isUser1 ? convo.user2_id : convo.user1_id;
    const otherUser = await userRepo.findByUserId(otherUserId as string);
    if (!otherUser) {
      throw new CustomError('User not found', 404);
    }
    // Get last message and unread count
    const sentMessages = isUser1 ? convo.unread_count_user1 : convo.unread_count_user2;
    const receivedMessages = isUser1 ? convo.user2_sent_messages : convo.user1_sent_messages;
    
    return {
      conversationId: convo._id,
      otherUser: {
        userId: otherUserId,
        firstName: otherUser.bio.first_name || '',
        lastName: otherUser.bio.last_name || '',
        profilePhoto: otherUser.profile_photo || ''
      },
      lastMessage: convo.last_message_text ? {
        message: convo.last_message_text,
        timestamp: convo.last_message_time,
        isOwnMessage: isUser1
      } : '',
      unreadCount: sentMessages
    };
  });
  
  // Wait for all promises to resolve
  const formattedUnseenCountByConversation = await Promise.all(conversationPromises);
  
  return res.status(200).json({ formattedUnseenCountByConversation });
});


/**
 * Mark a conversation as unread
 */

const markConversationAsUnread = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user
  const { conversationId } = req.params;
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new CustomError('Invalid conversation ID', 400);
  }
  
  // Use repository method to mark conversation as unread
  await conversationRepo.markConversationAsUnread(conversationId, userId as string);
  
  return res.status(200).json({ message: 'Conversation marked as unread' });
});


/**
 * Mark all messages in a conversation as read
 * 
 * @route PUT /api/v1/messages/conversations/:conversationId/read
 * @access Private - Requires authentication
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<Response>} JSON success message
 * @throws {CustomError} 401 - If user is not authenticated
 * @throws {CustomError} 400 - If conversation ID is invalid
 * @throws {CustomError} 404 - If conversation is not found
 * @throws {CustomError} 403 - If user does not have access to the conversation
 */
const markMessagesInConversationAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user
  const { conversationId } = req.params;
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new CustomError('Invalid conversation ID', 400);
  }
  
  // Use repository method to mark conversation as read
  await conversationRepo.markConversationAsRead(conversationId, userId as string);
  
  return res.status(200).json({ message: 'Conversation marked as read' });
});


/** 
  * Mark messages as seen in a conversation
  *@route PUT /api/v1/messages/conversations/:conversationId/mark-seen
  * @access Private - Requires authentication
  * @param {Request} req - Express request object with conversationId in params
  * @param {Response} res - Express response object
  * @param {NextFunction} next - Express next middleware function
  * @returns {Promise<Response>} JSON success message
  * @throws {CustomError} 401 - If user is not authenticated
  * @throws {CustomError} 400 - If conversation ID is invalid
  * @throws {CustomError} 404 - If conversation is not found
  * @throws {CustomError} 403 - If user does not have access to the conversation
  * @throws {CustomError} 500 - If marking as seen fails
  * @description Marks all messages in a conversation as seen for the logged-in user.
**/
const markMessagesAsSeen = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user
  const { conversationId } = req.params;
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new CustomError('Invalid conversation ID', 400);
  }
  
  // Use repository method to mark messages as seen
  await conversationRepo.markMessagesAsSeen(conversationId, userId as string);
  
  return res.status(200).json({ message: 'Messages marked as seen' });
});

/** 
  * Delete a message
  * 
  * @route DELETE /api/v1/messages/conversations/:conversationId/message/:messageId
  * @access Private - Requires authentication
  * @param {Request} req - Express request object with conversationId and messageId in params
  * @param {Response} res - Express response object
  * @param {NextFunction} next - Express next middleware function
  * @param {string} conversationId - ID of the conversation
  * @param {string} messageId - ID of the message to delete
  * @returns {Promise<Response>} JSON success message
  * @throws {CustomError} 401 - If user is not authenticated
  * @throws {CustomError} 400 - If conversation ID or message ID is invalid
  * @throws {CustomError} 404 - If conversation or message is not found
  * @throws {CustomError} 403 - If user does not have access to the conversation
  * @throws {CustomError} 500 - If message deletion fails
  * @description Deletes a message from a conversation.
**/
const deleteMessage = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user
  const { conversationId, messageId } = req.params;
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new CustomError('Invalid conversation ID', 400);
  }
  
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw new CustomError('Invalid message ID', 400);
  }
  
  // Use repository method to delete message
  await conversationRepo.deleteMessage(conversationId, messageId, userId as string);
  
  return res.status(200).json({ message: 'Message deleted successfully',isDeleted: true });
});

/**
 * Delete a conversation
 * 
 * @route DELETE /api/v1/messages/conversations/:conversationId
 * @access Private - Requires authentication
 * @param {Request} req - Express request object with conversationId in params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @param {string} conversationId - ID of the conversation to delete
 * * @returns {Promise<Response>} JSON success message
 * @throws {CustomError} 401 - If user is not authenticated
 * @throws {CustomError} 400 - If conversation ID is invalid
 * @throws {CustomError} 404 - If conversation is not found
 * @throws {CustomError} 403 - If user does not have access to the conversation
 * @throws {CustomError} 500 - If conversation deletion fails
 * @description Deletes a conversation for the logged-in user.
 * */
const deleteConversation = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user
  const { conversationId } = req.params;
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new CustomError('Invalid conversation ID', 400);
  }
  
  // Use repository method to delete conversation
  await conversationRepo.deleteConversation(conversationId);
  
  return res.status(200).json({ message: 'Conversation deleted successfully' });
}
);

/** 
  * Edit a message in a conversation
  * 
  * @route PUT /api/v1/messages/conversations/:conversationId/message/:messageId/edit
  * @access Private - Requires authentication
  * @param {Request} req - Express request object with conversationId and messageId in params
  * @param {Response} res - Express response object
  * @param {NextFunction} next - Express next middleware function
  * @param {string} conversationId - ID of the conversation
  * @param {string} messageId - ID of the message to edit
  * @body {string} message - New message content  
  * @returns {Promise<Response>} JSON success message
  * @throws {CustomError} 401 - If user is not authenticated
  * @throws {CustomError} 400 - If conversation ID or message ID is invalid
  * @throws {CustomError} 404 - If conversation or message is not found
  * @throws {CustomError} 403 - If user does not have access to the conversation
  * @throws {CustomError} 500 - If message editing fails
*/

const editMessage = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user
  const { conversationId, messageId } = req.params;
  const { message } = req.body;
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new CustomError('Invalid conversation ID', 400);
  }
  
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw new CustomError('Invalid message ID', 400);
  }
  
  // Use repository method to edit message
  await conversationRepo.editMessage(conversationId, messageId, userId as string, message);
  


  return res.status(200).json({ message: 'Message edited successfully', is_edited: true });
}
);

/**
 * React to a message in a conversation
 * 
 * @route POST /api/v1/messages/conversations/:conversationId/message/:messageId/react
 * @access Private - Requires authentication
 * @param {Request} req - Express request object with conversationId and messageId in params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @param {string} conversationId - ID of the conversation
 * @param {string} messageId - ID of the message to react to
 * @body {string} reaction - Reaction type (e.g., "like", "love")
 * * @returns {Promise<Response>} JSON success message
 * @throws {CustomError} 401 - If user is not authenticated
 * @throws {CustomError} 400 - If conversation ID or message ID is invalid
 * @throws {CustomError} 404 - If conversation or message is not found
 * @throws {CustomError} 403 - If user does not have access to the conversation
 * @throws {CustomError} 500 - If reaction fails
 */

const reactToMessage = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user
  const { conversationId, messageId } = req.params;
  const { reaction } = req.body;
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new CustomError('Invalid conversation ID', 400);
  }
  
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw new CustomError('Invalid message ID', 400);
  }
  
  // Use repository method to react to message
  await conversationRepo.reactToMessage(conversationId, messageId, reaction, userId as string);
  
  return res.status(200).json({ message: 'Reaction added successfully' });
}
);


export {
  startConversation,
  getConversations,
  getConversation,
  // blockUser,
  // unblockUser,
  markConversationAsUnread,
  getUnseenMessagesCount,
  markMessagesInConversationAsRead,
  getUnseenMessagesCountByConversation,
  checkConversationExists,
  markMessagesAsSeen,
  deleteMessage,
  deleteConversation,
  editMessage,
  reactToMessage
};