import express from 'express';
import * as messageController from '../../controllers/messaging/messaging.controller.ts';
import { authorizeMessaging } from '../../middleware/authMiddleware.ts';

const router = express.Router();

// Start a new conversation
router.post('/conversations/start-conversation/:user2ID', authorizeMessaging, messageController.startConversation);

// Send a message
router.post('/conversations/:conversationId/send-message', authorizeMessaging, messageController.sendMessage);

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

// Mark messages as seen
router.put('/messages/:conversationId/seen',authorizeMessaging,messageController.markMessagesAsSeen);

// Delete a message
router.delete('/messages/:messageId',authorizeMessaging,messageController.deleteMessage);

// Delete a conversation
router.delete('/conversations/:conversationId',authorizeMessaging,messageController.deleteConversation);

// Edit a message
router.patch('/messages/:messageId/edit',authorizeMessaging,messageController.editMessage);

// React to a message
router.post('/messages/:messageId/react',authorizeMessaging,messageController.reactToMessage);
// // Block a user from messaging
// router.post('/block',authorizeMessaging,messageController.blockUser);

// // Unblock a user
// router.post('/unblock',authorizeMessaging,messageController.unblockUser);







export default router;