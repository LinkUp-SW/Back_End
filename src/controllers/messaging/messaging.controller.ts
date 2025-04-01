import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../../middleware/asyncHandler.ts';
import { CustomError } from '../../utils/customError.utils.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import { conversationRepository } from '../../repositories/conversation.repository.ts';
import { UserRepository } from '../../repositories/user.repository.ts';
import mongoose from 'mongoose';
import { use } from 'passport';

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
  if (user2.blocked && user2.blocked.includes(user1Id as string)) {
    throw new CustomError('You cannot send messages to this user', 403);
  }

  const conversation = await conversationRepo.findConversationByUsers(user1Id as string, user2ID);
  if (conversation) {
    return res.status(200).json({ conversationId: conversation._id });
  } else {
    const newConversation = await conversationRepo.createConversation(user1Id as string , user2ID);
    return res.status(201).json({ conversationId: newConversation._id });
  }
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
  
  // Format the conversations to include only relevant information
  const formattedConversationsPromises = conversationsArray.map(async conversation => {
    // Determine if the user is user1 or user2
    const isUser1 = conversation.user1_id.toString() === userId.toString();
    const user2 = isUser1 ? conversation.user2_id : conversation.user1_id; 
    
    const otherUser = await userRepo.findByUserId(user2);
    if (!otherUser) {
      throw new CustomError('User not found', 404);
    }

    // Get last message and unread count
    const sentMessages = isUser1 ? conversation.user1_sent_messages : conversation.user2_sent_messages;
    const receivedMessages = isUser1 ? conversation.user2_sent_messages : conversation.user1_sent_messages;
    
    // Combine and sort all messages by timestamp
    const allMessages = [...sentMessages, ...receivedMessages].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    const lastMessage = allMessages.length > 0 ? allMessages[0] : null;
    // Define message interface
    interface Message {
      message: string;
      timestamp: Date | string;
      is_seen: boolean;
      reacted?: boolean;
      media?: any[];
    }
    
    const unreadCount: number = receivedMessages.filter((msg: Message) => !msg.is_seen).length;
    // otherUser = userRepo.findByUserId(userId as string);
    return {
      conversationId: conversation._id,
      otherUser: {
        userId: otherUser.user_id,
        firstName: otherUser.bio?.first_name || '',
        lastName: otherUser.bio?.last_name || '',
        profilePhoto: otherUser.profile_photo || ''
      },
      lastMessage: lastMessage ? {
        message: lastMessage.message,
        timestamp: lastMessage.timestamp,
        isOwnMessage: (isUser1 && sentMessages.includes(lastMessage)) || 
                      (!isUser1 && receivedMessages.includes(lastMessage))
      } : null,
      unreadCount
    };
  });
  const formattedConversations = await Promise.all(formattedConversationsPromises);
  
  return res.status(200).json({ 
    conversations: formattedConversations 
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
  for (const msg of conversation.user1_sent_messages) {
    allMessages.push({
      senderId: user1.user_id,
      senderName: `${user1.bio?.first_name || ''} ${user1.bio?.last_name || ''}`,
      message: msg.message,
      media: msg.media || [],
      timestamp: msg.timestamp,
      reacted: msg.reacted,
      isSeen: msg.is_seen,
      isOwnMessage: isUser1
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
      isSeen: msg.is_seen,
      isOwnMessage: isUser2
    });
  }
  
  // Sort messages by timestamp (newest first)
  allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  const otherUser = await userRepo.findByUserId(isUser1 ? conversation.user2_id : conversation.user1_id) ;
  
  if (!otherUser) {
    throw new CustomError('User not found', 404);
  }

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
 * Block a user from sending messages
 * 
 * @route POST /api/v1/messages/block
 * @access Private - Requires authentication
 * @param {Request} req - Express request object with blockUserId in body
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<Response>} JSON success message
 * @throws {CustomError} 401 - If user is not authenticated
 * @throws {CustomError} 400 - If blockUserId is missing or user is already blocked
 * @throws {CustomError} 404 - If user to block or current user is not found
 */
// const blockUser = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
//   const userId = req.user
//   const { blockUserId } = req.body;
  
//   if (!userId) {
//     throw new CustomError('User not authenticated', 401);
//   }
  
//   if (!blockUserId) {
//     throw new CustomError('User ID to block is required', 400);
//   }
  
//   await conversationRepo.blockUser(userId as string, blockUserId);
  
//   return res.status(200).json({ message: 'User blocked successfully' });
// });

/**
 * Unblock a previously blocked user
 * 
 * @route POST /api/v1/messages/unblock
 * @access Private - Requires authentication
 * @param {Request} req - Express request object with unblockUserId in body
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<Response>} JSON success message
 * @throws {CustomError} 401 - If user is not authenticated
 * @throws {CustomError} 400 - If unblockUserId is missing or user is not blocked
 * @throws {CustomError} 404 - If current user is not found
 */
// const unblockUser = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
//   let userId = req.user
//   const { unblockUserId } = req.body;
  
//   if (!userId) {
//     throw new CustomError('User not authenticated', 401);
//   }

  
//   if (!unblockUserId) {
//     throw new CustomError('User ID to unblock is required', 400);
//   }


//   // Get current user
//   const currentUser = await userRepo.findByUserId(userId as string); 
//   if (!currentUser) {
//     throw new CustomError('Current user not found', 404);
//   }
  
//   // Check if user was blocked
//   if (!currentUser.blocked || !currentUser.blocked.includes(unblockUserId)) {
//     throw new CustomError('User is not blocked', 400);
//   }
  
//   // Use repository method to unblock user
//   await conversationRepo.unblockUser(userId as string, unblockUserId);
  
//   // Remove from blocked list
//   currentUser.blocked = currentUser.blocked.filter(id => id !== unblockUserId);
//   await currentUser.save();
  
//   return res.status(200).json({ message: 'User unblocked successfully' });
// });

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
const markConversationAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
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

export {
  startConversation,
  getConversations,
  getConversation,
  // blockUser,
  // unblockUser,
  getUnseenMessagesCount,
  markConversationAsRead
};