import { io, Socket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import fetch from "node-fetch";
import dotenv from 'dotenv';
import { NotificationType } from '../../models/notifications.model.ts';

dotenv.config();

// Constants
const SERVER_URL = "http://localhost:3000"; // Make sure this matches your server's port
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret'; 


// Test users (replace with actual test user IDs from your database)
const USER1_ID = 'newtestUserId'; // The user receiving notifications
const USER2_ID = 'NotifUser-0'; // The user sending notifications
const USER3_ID = 'NotifUser-1'; // Another user for testing

// Connection test duration
const TEST_DURATION_MS = 60000; // 60 seconds

// Create token for authentication
function createToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

// Helper to wait for specific events
function waitForEvent(socket: Socket, eventName: string, timeout = 5000, predicate?: (data: any) => boolean): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, eventHandler);
      reject(new Error(`Event "${eventName}" timed out after ${timeout}ms${predicate ? ' (predicate not met)' : ''}`));
    }, timeout);

    const eventHandler = (data: any) => {
      if (!predicate || predicate(data)) {
        clearTimeout(timer);
        socket.off(eventName, eventHandler);
        resolve(data);
      }
    };

    socket.on(eventName, eventHandler);
  });
}

// Helper to listen for multiple events
function listenForEvents(socket: Socket, eventName: string, count: number, timeout = 5000): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const receivedEvents: any[] = [];
    const timer = setTimeout(() => {
      socket.off(eventName, eventHandler);
      if (receivedEvents.length < count) {
        reject(new Error(`Expected ${count} "${eventName}" events, but only received ${receivedEvents.length} within ${timeout}ms`));
      } else {
        resolve(receivedEvents);
      }
    }, timeout);

    const eventHandler = (data: any) => {
      receivedEvents.push(data);
      if (receivedEvents.length === count) {
        clearTimeout(timer);
        socket.off(eventName, eventHandler);
        resolve(receivedEvents);
      }
    };

    socket.on(eventName, eventHandler);
  });
}

// Setup sockets for different users
let socket1: Socket; // Receiving user
let socket2: Socket; // Sending user
let socket3: Socket; // Another user for testing

// Global variables for test data
let notificationId: string;

// Test cases
async function testAuthentication() {
  console.log("Testing authentication for all users...");
  
  // Listen for authenticated events
  const auth1Promise = waitForEvent(socket1, "authenticated");
  const auth2Promise = waitForEvent(socket2, "authenticated");
  const auth3Promise = waitForEvent(socket3, "authenticated");
  
  // Wait for unread counts that should be sent on authentication
  const unreadCount1Promise = waitForEvent(socket1, "unread_notifications_count");
  
  // Authenticate users
  socket1.emit("authenticate", { token: createToken(USER1_ID) });
  socket2.emit("authenticate", { token: createToken(USER2_ID) });
  socket3.emit("authenticate", { token: createToken(USER3_ID) });
  
  // Wait for authentication and initial count
  await Promise.all([auth1Promise, auth2Promise, auth3Promise]);
  const unreadCountData = await unreadCount1Promise;
  
  console.log("All users authenticated successfully");
  console.log(`User1 initial unread notifications count: ${unreadCountData.count}`);
}



async function testConnectionRequestNotification() {
    console.log("Testing connection request notification...");
    
    // Actually trigger the connection request via API
    await fetch(`${SERVER_URL}/api/my-network/connect/${USER1_ID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${createToken(USER2_ID)}`
        }
      });

    // User1 waits for a notification
    const notificationPromise = waitForEvent(socket1, "new_notification", 15000);
    
    // User1 waits for count update
    const countUpdatePromise = waitForEvent(socket1, "unread_notifications_count");
    
    // Simulate User2 sending a connection request to User1
    console.log("Simulating connection request from User2 to User1...");
  
    
  
    try {
      // Wait for the notification and count update
      const notificationData = await notificationPromise;
      const countData = await countUpdatePromise;
      
      console.log("Connection request notification received:", notificationData);
      console.log("Updated unread count:", countData.count);
      
      // Store notification ID for later tests
      notificationId = notificationData.id;
      
    } catch (error) {
      console.error("Connection request notification test failed:", error);
      throw error;
    }
  }

async function testCommentNotification() {
  console.log("Testing comment notification...");
  
  // User1 waits for a notification
  const notificationPromise = waitForEvent(socket1, "new_notification", 5000, (data) => 
    data.type === NotificationType.COMMENT && 
    data.senderId === USER3_ID
  );
  
  // Simulate User3 commenting on User1's post
  console.log("Simulating comment from User3 on User1's post...");
  
  try {
    const notificationData = await notificationPromise;
    console.log("Comment notification received:", notificationData);
  } catch (error) {
    console.error("Comment notification test failed:", error);
    throw error;
  }
}

async function testLikeNotification() {
  console.log("Testing like notification...");
  
  // User1 waits for a notification
  const notificationPromise = waitForEvent(socket1, "new_notification", 5000, (data) => 
    data.type === NotificationType.REACTED && 
    data.senderId === USER2_ID
  );
  
  // Simulate User2 liking User1's post
  console.log("Simulating like from User2 on User1's post...");
  
  try {
    const notificationData = await notificationPromise;
    console.log("Like notification received:", notificationData);
  } catch (error) {
    console.error("Like notification test failed:", error);
    throw error;
  }
}

async function testMessageNotification() {
  console.log("Testing message notification...");
  
  // User1 waits for a notification
  const notificationPromise = waitForEvent(socket1, "new_notification", 5000, (data) => 
    data.type === NotificationType.MESSAGE && 
    data.senderId === USER3_ID
  );
  
  // Simulate User3 sending a message to User1
  console.log("Simulating message from User3 to User1...");
  
  try {
    const notificationData = await notificationPromise;
    console.log("Message notification received:", notificationData);
  } catch (error) {
    console.error("Message notification test failed:", error);
    throw error;
  }
}

async function testMarkingNotificationAsRead() {
  console.log("Testing marking a single notification as read...");
  
  // Make sure we have a notification ID from previous tests
  if (!notificationId) {
    console.error("No notification ID available for read test");
    return;
  }
  
  // User1 waits for count update
  const countUpdatePromise = waitForEvent(socket1, "unread_notifications_count");
  
  // Mark notification as read
  socket1.emit("mark_notification_read", { notificationId });
  console.log(`Marking notification ${notificationId} as read...`);
  
  try {
    const countData = await countUpdatePromise;
    console.log("Updated unread count after marking one as read:", countData.count);
  } catch (error) {
    console.error("Mark notification as read test failed:", error);
    throw error;
  }
}

async function testMarkingAllNotificationsAsRead() {
  console.log("Testing marking all notifications as read...");
  
  // User1 waits for count update
  const countUpdatePromise = waitForEvent(socket1, "unread_notifications_count", 5000, (data) => data.count === 0);
  
  // Mark all notifications as read
  socket1.emit("mark_all_notifications_read");
  console.log("Marking all notifications as read...");
  
  try {
    const countData = await countUpdatePromise;
    console.log("Updated unread count after marking all as read:", countData.count);
    
    if (countData.count !== 0) {
      console.error("Expected count to be 0 after marking all as read");
    }
  } catch (error) {
    console.error("Mark all notifications as read test failed:", error);
    throw error;
  }
}

// Error handling for socket events
function setupErrorHandlers(socket: Socket, label: string) {
  socket.on("connect_error", (error) => {
    console.error(`${label} connection error:`, error);
  });
  
  socket.on("error", (error) => {
    console.error(`${label} socket error:`, error);
  });
  
  socket.on("notification_error", (error) => {
    console.error(`${label} notification error:`, error);
  });
}

// Main test function
async function runTests() {
  try {
    console.log("Starting notification system tests...");
    console.log(`Connecting to server at ${SERVER_URL}...`);
    
    // Initialize sockets
    socket1 = io(SERVER_URL);
    socket2 = io(SERVER_URL);
    socket3 = io(SERVER_URL);
    
    // Setup error handlers
    setupErrorHandlers(socket1, "User1");
    setupErrorHandlers(socket2, "User2");
    setupErrorHandlers(socket3, "User3");
    
    // Setup debug event listeners
    socket1.on("new_notification", (data) => {
      console.log("User1 - new_notification received:", data);
    });
    
    socket1.on("unread_notifications_count", (data) => {
      console.log("User1 - unread_notifications_count updated:", data);
    });
    
    // Wait for connections
    await Promise.all([
      waitForEvent(socket1, "connect"),
      waitForEvent(socket2, "connect"),
      waitForEvent(socket3, "connect")
    ]);
    console.log("All sockets connected");
    
    // Run test cases
    await testAuthentication();
    await testConnectionRequestNotification();
    await testLikeNotification();
    await testCommentNotification();
    await testMessageNotification();
    await testMarkingNotificationAsRead();
    await testMarkingAllNotificationsAsRead();
    
    console.log("All tests completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    // Clean up
    console.log("Cleaning up...");
    socket1.disconnect();
    socket2.disconnect();
    socket3.disconnect();
    process.exit(0);
  }
}

// Run the tests with a timeout
const testTimeout = setTimeout(() => {
  console.error("Tests timed out");
  process.exit(1);
}, TEST_DURATION_MS);

// Start the tests
runTests().then(() => {
  clearTimeout(testTimeout);
});