import express from 'express';
import * as messageController from '../../controllers/messaging/messaging.controller.ts';
import { authorizeMessaging } from '../../middleware/authMiddleware.ts';

const router = express.Router();

// Start a new conversation
router.post('/conversations/start-conversation/:user2ID', authorizeMessaging, messageController.startConversation);

// Get all conversations for the logged-in user
router.get('/conversations',authorizeMessaging,messageController.getConversations);

// Get a specific conversation
router.get('/conversations/:conversationId',authorizeMessaging,messageController.getConversation);

// // Block a user from messaging
// router.post('/block',authorizeMessaging,messageController.blockUser);

// // Unblock a user
// router.post('/unblock',authorizeMessaging,messageController.unblockUser);

// Get unseen messages count
router.get('/unseen-count',authorizeMessaging,messageController.getUnseenMessagesCount);

// Mark conversation as read
router.put('/conversations/:conversationId/read',authorizeMessaging,messageController.markConversationAsRead);



export default router;