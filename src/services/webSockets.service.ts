import { Server as SocketIOServer } from "socket.io";
import { Server } from "http";
import { UserRepository } from "../repositories/user.repository.ts";
import { conversationRepository } from "../repositories/conversation.repository.ts";
import tokenUtils from "../utils/token.utils.ts";

export class WebSocketService {
  private io: SocketIOServer;
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private typingUsers: Map<string, NodeJS.Timeout> = new Map(); // conversationId_userId -> timeout
  private userRepo: UserRepository;
  private conversationRepo: conversationRepository;

  constructor(
    server: Server, 
    userRepo: UserRepository = new UserRepository(), 
    conversationRepo: conversationRepository = new conversationRepository()
  ) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_REDIRECT_URL,
        credentials: true,
      },
    });
    this.userRepo = userRepo;
    this.conversationRepo = conversationRepo;
    
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    this.io.on("connection", (socket) => {
      console.log(`New socket connection: ${socket.id}`);

      // Authenticate user via token
      socket.on("authenticate", async (data: { token: string }) => {
        try {
          const decoded = tokenUtils.validateToken(data.token) as { userId: string };
          if (!decoded || !decoded.userId) {
            socket.emit("authentication_error", { message: "Invalid token" });
            return;
          }

          const userId = decoded.userId;
          await this.registerUserSocket(userId, socket.id);
          socket.emit("authenticated");

          // Send unread messages count immediately after authentication
          const unreadCount = await this.getUnseenMessagesCount(userId);
          socket.emit("unread_messages_count", { count: unreadCount });
        } catch (error) {
          socket.emit("authentication_error", {
            message: "Authentication failed",
          });
        }
      });

      // Handle private messages
      socket.on(
        "private_message",
        async (data: { to: string; message: string; media?: string[] }) => {
          await this.handlePrivateMessage(socket.id, data);
        }
      );

      // Handle typing indicators
      socket.on("typing", async (data: { conversationId: string }) => {
        await this.handleTypingIndicator(socket.id, data.conversationId);
      });

      // Handle stop typing
      socket.on("stop_typing", async (data: { conversationId: string }) => {
        await this.handleStopTypingIndicator(socket.id, data.conversationId);
      });

      // Mark conversation as read
      socket.on("mark_as_read", async (data: { conversationId: string }) => {
        await this.markConversationAsRead(socket.id, data.conversationId);
      });

      // Disconnect
      socket.on("disconnect", () => {
        this.handleDisconnect(socket.id);
      });
    });
  }
  
  private async registerUserSocket(
    userId: string,
    socketId: string
  ): Promise<void> {
    this.userSockets.set(userId, socketId);
    console.log(`User ${userId} registered with socket ${socketId}`);
  }

  private async handleDisconnect(socketId: string): Promise<void> {
    // Find and remove the user from userSockets
    let disconnectedUserId: string | undefined;
    for (const [userId, storedSocketId] of this.userSockets.entries()) {
      if (storedSocketId === socketId) {
        disconnectedUserId = userId;
        break;
      }
    }

    if (disconnectedUserId) {
      this.userSockets.delete(disconnectedUserId);
      console.log(`User ${disconnectedUserId} disconnected`);
    }
  }

  private async getUserIdFromSocket(socketId: string): Promise<string | null> {
    for (const [userId, storedSocketId] of this.userSockets.entries()) {
      if (storedSocketId === socketId) {
        return userId;
      }
    }
    return null;
  }

  private async handlePrivateMessage(
    senderSocketId: string,
    data: { to: string; message: string; media?: string[] }
  ): Promise<void> {
    try {
      const senderId = await this.getUserIdFromSocket(senderSocketId);
      if (!senderId) {
        throw new Error("Sender not authenticated");
      }

      // Check if receiver has blocked the sender
      const receiver = await this.userRepo.findByUserId(data.to);
      if (!receiver) {
        throw new Error("Recipient not found");
      }

      if (receiver.blocked && receiver.blocked.includes(senderId)) {
        this.io.to(senderSocketId).emit("message_error", {
          message: "You can't send messages to this user",
        });
        return;
      }

      // Find or create conversation
      let conversation = await this.conversationRepo.findConversationByUsers(senderId, data.to);
      
      if (!conversation) {
        conversation = await this.conversationRepo.createConversation(senderId, data.to);
      }

      // Create the message object
      const messageObj = {
        message: data.message,
        media: data.media || [],
        timestamp: new Date(),
        reacted: false,
        is_seen: false,
      };

      // Add message to the conversation
      await this.conversationRepo.addMessage(
        conversation._id.toString(),
        senderId,
        data.to,
        data.message,
        data.media || []
      );

      // Send message to recipient if online
      const receiverSocketId = this.userSockets.get(data.to);
      if (receiverSocketId) {
        this.io.to(receiverSocketId).emit("new_message", {
          conversationId: conversation._id,
          senderId: senderId,
          message: messageObj,
        });

        // Update unread count for receiver
        const unreadCount = await this.getUnseenMessagesCount(data.to);
        this.io
          .to(receiverSocketId)
          .emit("unread_messages_count", { count: unreadCount });
      }

      // Confirm message sent to sender
      this.io.to(senderSocketId).emit("message_sent", {
        conversationId: conversation._id,
        recipientId: data.to,
        message: messageObj,
      });
    } catch (error) {
      console.error("Error sending private message:", error);
      this.io.to(senderSocketId).emit("message_error", {
        message: "Failed to send message",
      });
    }
  }

  private async handleTypingIndicator(
    socketId: string,
    conversationId: string
  ): Promise<void> {
    try {
      const userId = await this.getUserIdFromSocket(socketId);
      if (!userId) return;

      const conversation = await this.conversationRepo.getConversation(conversationId);
      if (!conversation) return;

      // Determine the recipient
      const recipientId =
        conversation.user1_id.toString() === userId
          ? conversation.user2_id.toString()
          : conversation.user1_id.toString();

      const typingKey = `${conversationId}_${userId}`;

      // Clear existing timeout if it exists
      if (this.typingUsers.has(typingKey)) {
        clearTimeout(this.typingUsers.get(typingKey));
      }

      // Set new timeout to automatically stop typing indicator after 3 seconds
      const timeout = setTimeout(() => {
        this.handleStopTypingIndicator(socketId, conversationId);
      }, 3000);

      this.typingUsers.set(typingKey, timeout);

      // Send typing indicator to recipient
      const recipientSocketId = this.userSockets.get(recipientId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit("user_typing", {
          conversationId,
          userId,
        });
      }
    } catch (error) {
      console.error("Error handling typing indicator:", error);
    }
  }

  private async handleStopTypingIndicator(
    socketId: string,
    conversationId: string
  ): Promise<void> {
    try {
      const userId = await this.getUserIdFromSocket(socketId);
      if (!userId) return;

      const conversation = await this.conversationRepo.getConversation(conversationId);
      if (!conversation) return;

      // Determine the recipient
      const recipientId =
        conversation.user1_id.toString() === userId
          ? conversation.user2_id.toString()
          : conversation.user1_id.toString();

      const typingKey = `${conversationId}_${userId}`;

      // Clear the timeout and remove from map
      if (this.typingUsers.has(typingKey)) {
        clearTimeout(this.typingUsers.get(typingKey));
        this.typingUsers.delete(typingKey);
      }

      // Send stop typing indicator to recipient
      const recipientSocketId = this.userSockets.get(recipientId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit("user_stop_typing", {
          conversationId,
          userId,
        });
      }
    } catch (error) {
      console.error("Error handling stop typing indicator:", error);
    }
  }

  private async markConversationAsRead(
    socketId: string,
    conversationId: string
  ): Promise<void> {
    try {
      const userId = await this.getUserIdFromSocket(socketId);
      if (!userId) return;

      const updated = await this.conversationRepo.markConversationAsRead(
        conversationId, 
        userId
      );
      
      if (updated) {
        const conversation = await this.conversationRepo.getConversation(conversationId);
        
        // Notify the other user about read receipts
        const otherUserId =
          conversation.user1_id.toString() === userId
            ? conversation.user2_id.toString()
            : conversation.user1_id.toString();

        const otherUserSocketId = this.userSockets.get(otherUserId);

        if (otherUserSocketId) {
          this.io.to(otherUserSocketId).emit("messages_read", {
            conversationId,
            readBy: userId,
          });
        }

        // Update unread count for the current user
        const unreadCount = await this.getUnseenMessagesCount(userId);
        this.io
          .to(socketId)
          .emit("unread_messages_count", { count: unreadCount });
      }
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  }

  private async getUnseenMessagesCount(userId: string): Promise<number> {
    try {
      // Use repository to get total unread count
      return await this.conversationRepo.getTotalUnreadCount(userId);
    } catch (error) {
      console.error("Error getting unseen messages count:", error);
      return 0;
    }
  }
}