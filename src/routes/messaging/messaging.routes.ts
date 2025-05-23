import express from 'express';
import * as messageController from '../../controllers/messaging/messaging.controller.ts';
import { authorizeMessaging } from '../../middleware/authMiddleware.ts';

const router = express.Router();

// Start a new conversation
router.post('/conversations/start-conversation/:user2ID', authorizeMessaging, messageController.startConversation);

// Check if a conversation exists between two users
router.get('/conversations/check-conversation/:user2ID', authorizeMessaging, messageController.checkConversationExists);

// Get all conversations for the logged-in user
router.get('/conversations',authorizeMessaging,messageController.getConversations);

// Get a specific conversation
router.get('/conversations/:conversationId',authorizeMessaging,messageController.getConversation);

// Get unread conversations
router.get('/conversation/unread-conversations',authorizeMessaging,messageController.getUnseenMessagesCount);

// Get unread messages count for each conversation of user
router.get('/conversation/unread-messages-count',authorizeMessaging,messageController.getUnseenMessagesCountByConversation);

// Mark messages in conversation as read
router.put('/conversations/:conversationId/read',authorizeMessaging,messageController.markMessagesInConversationAsRead);

//Mark conversation as unread
router.put('/conversations/:conversationId/unread',authorizeMessaging,messageController.markConversationAsUnread);

// Mark messages as seen
router.put('/messages/:conversationId/seen',authorizeMessaging,messageController.markMessagesAsSeen);

// Delete a message
router.delete('/messages/:conversationId/:messageId',authorizeMessaging,messageController.deleteMessage);

// Delete a conversation
router.delete('/conversations/:conversationId',authorizeMessaging,messageController.deleteConversation);

// Edit a message
router.patch('/messages/:conversationId/:messageId/edit',authorizeMessaging,messageController.editMessage);

// React to a message
router.post('/messages/:messageId/react',authorizeMessaging,messageController.reactToMessage);


export default router;