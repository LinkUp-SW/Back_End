import { Server as SocketIOServer, Socket } from "socket.io";
import { Server } from "http";
import { UserRepository } from "../repositories/user.repository.ts";
import { conversationRepository } from "../repositories/conversation.repository.ts";
import tokenUtils from "../utils/token.utils.ts";
import { CustomError } from "../utils/customError.utils.ts";
import {uploadMedia} from "../utils/helper.ts";
import { on } from "events";

export class WebSocketService {
  private io: SocketIOServer;
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private typingUsers: Map<string, NodeJS.Timeout> = new Map(); // conversationId_userId -> timeout
  private userRepo: UserRepository;
  private conversationRepo: conversationRepository;

  public onlineUsers: Map<string, string> = new Map(); // userId -> socketId
  public onlineUsersCount: number = 0; // Count of online users

  constructor(
    server: Server, 
    userRepo: UserRepository = new UserRepository(), 
    conversationRepo: conversationRepository = new conversationRepository(),
  ) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_REDIRECT_URL,
        credentials: true,
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      },
      maxHttpBufferSize: 1e8, // 100 MB
    });
    this.userRepo = userRepo;
    this.conversationRepo = conversationRepo;
    this.userSockets = new Map(); // Initialize userSockets
    
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log(`New socket connection: ${socket.id}`);
      
      // Middleware for authentication
      socket.use(([event, ...args], next) => {
        if (event === "authenticate") return next();
        if (!this.getUserIdFromSocket(socket.id)) {
          return next(new Error("Unauthorized"));
        }
        next();
      });

      socket.on("authenticate", async (data: { token: string }) => {
        try {
          const decoded = tokenUtils.validateToken(data.token) as { userId: string };
          if (!decoded?.userId) {
            throw new CustomError("Invalid token", 401);
          }

          await this.handleAuthentication(socket, decoded.userId);
        } catch (error) {
          console.error("Authentication error:", error);
          socket.emit("authentication_error", {
            message: error instanceof CustomError ? error.message : "Authentication failed"
          });
        }
      });

      // Message handlers
      socket.on("private_message", (data) => this.handlePrivateMessage(socket, data)); // Send new message
      socket.on("react_to_message", this.handleMessageReaction.bind(this, socket));
      
      // Typing indicators
      socket.on("typing", this.handleTypingIndicator.bind(this, socket));
      socket.on("stop_typing", this.handleStopTypingIndicator.bind(this, socket));
      
      // Read receipts
      socket.on("mark_as_read", this.markConversationAsRead.bind(this, socket));
      
      // Presence
      socket.on("disconnect", () => this.handleDisconnect(socket));
      socket.on("online", () => this.handleOnlineStatus(socket, true));
      socket.on("offline", () => this.handleOnlineStatus(socket, false));
    });
  }

  private async handleAuthentication(socket: Socket, userId: string): Promise<void> {
    await this.registerUserSocket(userId, socket.id);
    
    const user = await this.userRepo.findByUserId(userId);
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    // Update online status
    this.handleOnlineStatus(socket, true);

    // Send initial data
    const [unreadCount, unreadConversations] = await Promise.all([
      this.getUnseenMessagesCount(userId),
      this.conversationRepo.getUnreadConversations(userId)
    ]);

    socket.emit("authenticated", { userId });
    socket.emit("unread_messages_count", { count: unreadCount });
    socket.emit("unread_conversations", { conversations: unreadConversations });
  }

  private async handlePrivateMessage(socket: Socket, data: { to: string; message: string; media?: string[] }) {
    try {
      const senderId = await this.getUserIdFromSocket(socket.id);
      if (!senderId) throw new CustomError("Sender not authenticated", 401);
  
      const { to: receiverId, message, media } = data;
      console.log("Received private message:", { senderId, receiverId, message });
      console.log("[DEBUG] Received payload:", {
        mediaExists: !!media,
        mediaLength: media?.length || 0
      });
  
      let mediaUrls: string[] = [];
      let mediaTypes: string[] = [];
  
      // Only process media if provided and non-empty
      if (media && media.length > 0) {
        if (!Array.isArray(media)) {
          throw new CustomError("Media should be an array", 400);
        }
        if (media.length > 5) {
          throw new CustomError("Maximum 5 media files allowed", 400);
        }
        if (media.some(m => !m.startsWith("data:"))) {
          throw new CustomError("Invalid media format", 400);
        }
        const mediaUploads = media.map(async (base64Data) => {
          const { url, type } = await uploadMedia(base64Data);
          return { url, type };
        });
        console.log("Uploading media to Cloudinary...:", mediaUploads);
        const mediaResults = await Promise.all(mediaUploads);
        mediaUrls = mediaResults.map(m => m.url);
        mediaTypes = mediaResults.map(m => m.type);
        console.log("Media URLs:", mediaUrls);
      }
  
      // Find or create conversation
      let conversation = await this.conversationRepo.findConversationByUsers(senderId, receiverId);
      if (!conversation) {
        conversation = await this.conversationRepo.createConversation(senderId, receiverId);
      }
  
      await this.conversationRepo.addMessage(
        conversation._id.toString(),
        senderId,
        message,
        mediaUrls,
        mediaTypes
      );
  
      // Prepare message object for real-time delivery
      const messageObj = {
        conversationId: conversation._id,
        senderId,
        message: {
          message,
          media: mediaUrls,
          timestamp: new Date(),
          is_seen: false
        }
      };
  
      // Deliver to recipient if online
      const receiverSocketId = this.userSockets.get(receiverId);
      if (receiverSocketId) {
        this.io.to(receiverSocketId).emit("new_message", messageObj);
  
        // Update unread count
        const unreadCount = await this.getUnseenMessagesCount(receiverId);
        this.io.to(receiverSocketId).emit("unread_messages_count", { count: unreadCount });
      }
  
      // Confirm to sender
      socket.emit("message_sent", {
        ...messageObj,
        recipientId: receiverId
      });
  
    } catch (error) {
      console.error("Message send error:", error);
      socket.emit("message_error", {
        message: error instanceof CustomError ? error.message : "Failed to send message"
      });
    }
  }
  

  private async handleMessageReaction(socket: Socket, data: { conversationId: string; messageId: string; reaction: string }) {
    try {
      const userId = await this.getUserIdFromSocket(socket.id);
      if (!userId) throw new CustomError("Unauthorized", 401);

      const { conversationId, messageId, reaction } = data;

      const updated = await this.conversationRepo.reactToMessage(
        conversationId,
        messageId, 
        userId, 
        reaction
      );

      if (updated) {
        // Broadcast to all participants
        const conversation = await this.conversationRepo.getConversation(conversationId);
        const participants = [conversation.user1_id, conversation.user2_id];
        
        participants.forEach(participantId => {
          const participantSocketId = this.userSockets.get(participantId.toString());
          if (participantSocketId) {
            this.io.to(participantSocketId).emit("message_reacted", { 
              messageId, 
              reaction,
              reactedBy: userId
            });
          }
        });
      }
    } catch (error) {
      console.error("Reaction error:", error);
      socket.emit("reaction_error", {
        message: error instanceof CustomError ? error.message : "Failed to react to message"
      });
    }
  }

  private async handleTypingIndicator(socket: Socket, data: { conversationId: string }) {
    try {
      const userId = await this.getUserIdFromSocket(socket.id);
      if (!userId) return;

      const { conversationId } = data;
      const conversation = await this.conversationRepo.getConversation(conversationId);
      if (!conversation) return;

      const recipientId = conversation.user1_id.toString() === userId 
        ? conversation.user2_id.toString() 
        : conversation.user1_id.toString();

      const typingKey = `${conversationId}_${userId}`;

      // Clear existing timeout
      if (this.typingUsers.has(typingKey)) {
        clearTimeout(this.typingUsers.get(typingKey));
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        this.handleStopTypingIndicator(socket, { conversationId });
      }, 3000);

      this.typingUsers.set(typingKey, timeout);

      // Notify recipient
      const recipientSocketId = this.userSockets.get(recipientId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit("user_typing", {
          conversationId,
          userId
        });
      }
    } catch (error) {
      console.error("Typing indicator error:", error);
    }
  }

  private async handleStopTypingIndicator(socket: Socket, data: { conversationId: string }) {
    try {
      const userId = await this.getUserIdFromSocket(socket.id);
      if (!userId) return;

      const { conversationId } = data;
      const conversation = await this.conversationRepo.getConversation(conversationId);
      if (!conversation) return;

      const recipientId = conversation.user1_id.toString() === userId 
        ? conversation.user2_id.toString() 
        : conversation.user1_id.toString();

      const typingKey = `${conversationId}_${userId}`;

      // Clear timeout
      if (this.typingUsers.has(typingKey)) {
        clearTimeout(this.typingUsers.get(typingKey));
        this.typingUsers.delete(typingKey);
      }

      // Notify recipient
      const recipientSocketId = this.userSockets.get(recipientId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit("user_stop_typing", {
          conversationId,
          userId
        });
      }
    } catch (error) {
      console.error("Stop typing error:", error);
    }
  }

  private async markConversationAsRead(socket: Socket, data: { conversationId: string }) {
    try {
      const userId = await this.getUserIdFromSocket(socket.id);
      if (!userId) throw new CustomError("Unauthorized", 401);

      const { conversationId } = data;
      const updated = await this.conversationRepo.markConversationAsRead(conversationId, userId);
      
      if (updated) {
        const conversation = await this.conversationRepo.getConversation(conversationId);
        const otherUserId = conversation.user1_id.toString() === userId 
          ? conversation.user2_id.toString() 
          : conversation.user1_id.toString();

        // Notify other user
        const otherUserSocketId = this.userSockets.get(otherUserId);
        if (otherUserSocketId) {
          this.io.to(otherUserSocketId).emit("messages_read", {
            conversationId,
            readBy: userId
          });
        }

        // Update unread count for current user
        const unreadCount = await this.getUnseenMessagesCount(userId);
        socket.emit("unread_messages_count", { count: unreadCount });
      }
    } catch (error) {
      console.error("Mark as read error:", error);
      socket.emit("read_error", {
        message: error instanceof CustomError ? error.message : "Failed to mark as read"
      });
    }
  }

  

  private async handleOnlineStatus(socket: Socket, isOnline: boolean) {
    try {
      const userId = await this.getUserIdFromSocket(socket.id);
      if (!userId) return;

      const user = await this.userRepo.findByUserId(userId);
      if (!user)
        {
          console.error("User not found:", userId);
          return;
        };
      if (user.online_status === isOnline) return; // No change in status

      if (isOnline) {
        this.userSockets.set(userId, socket.id);
        this.onlineUsers.set(userId, socket.id);
        this.onlineUsersCount++;
      }
      else {
        this.userSockets.delete(userId);
        this.onlineUsers.delete(userId);
        this.onlineUsersCount--;
      }

      user.online_status = isOnline;
      await user.save();

      this.notifyPresenceChange(userId, isOnline);
    } catch (error) {
      console.error("Online status error:", error);
    }
  }

  private notifyPresenceChange(userId: string, isOnline: boolean) {
    // Notify all connections about presence change
    this.io.emit(isOnline ? "user_online" : "user_offline", { userId });
  }

  private async handleDisconnect(socket: Socket) {
    const userId = await this.getUserIdFromSocket(socket.id);
    if (!userId) return;

    this.userSockets.delete(userId);
    console.log(`User ${userId} disconnected`);

    // Update online status
    const user = await this.userRepo.findByUserId(userId);
    if (user) {
      user.online_status = false;
      await user.save();
      this.notifyPresenceChange(userId, false);
    }
  }

  private async registerUserSocket(userId: string, socketId: string): Promise<void> {
    this.userSockets.set(userId, socketId);
    console.log(`User ${userId} registered with socket ${socketId}`);
  }

  private async getUserIdFromSocket(socketId: string): Promise<string | null> {
    for (const [userId, storedSocketId] of this.userSockets.entries()) {
      if (storedSocketId === socketId) {
        return userId;
      }
    }
    return null;
  }

  private async getUnseenMessagesCount(userId: string): Promise<number> {
    try {
      return await this.conversationRepo.getTotalUnreadCount(userId);
    } catch (error) {
      console.error("Error getting unseen messages count:", error);
      return 0;
    }
  }
}