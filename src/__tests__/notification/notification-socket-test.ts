import { io, Socket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { NotificationType } from '../../models/notifications.model.ts';

dotenv.config();

// Constants
const SERVER_URL = "http://localhost:3000"; // Make sure this matches your server's port
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret'; 
const USER1_ID = 'testUserId'; // The user receiving notifications
const USER2_ID = 'NotifUser-10'; // The user sending notifications
const USER3_ID = 'NotifUser-11'; // Another user for testing
const TEST_DURATION_MS = 60000; // 60 seconds

// Helper Functions
function createToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

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

// Test Cases
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

// //async function testConnectionRequestNotification() {
//   console.log("Testing connection request notification...");

//   // Set up listener first
//   const notificationPromise = waitForEvent(socket1, "new_notification", 10000);
//   const countUpdatePromise = waitForEvent(socket1, "unread_notifications_count", 10000);

//   // Send notification directly through socket2
//   console.log("Sending connection request notification directly...");
//   socket2.emit("new_notification", {
//     recipientId: USER1_ID,
//     senderId: USER2_ID,
//     type: NotificationType.CONNECTION_REQUEST,
//     content: "User2 sent you a connection request"
//   });

//   try {
//     // Wait for the notification and count update
//     const [notificationData, countData] = await Promise.all([
//       notificationPromise.catch(err => {
//         console.error("Notification promise error:", err);
//         return null;
//       }), 
//       countUpdatePromise.catch(err => {
//         console.error("Count update promise error:", err);
//         return null;
//       })
//     ]);

//     if (notificationData) {
//       console.log("Connection request notification received:", notificationData);
//       notificationId = notificationData.id;
//     } else {
//       console.error("Failed to receive notification");
//     }

//     if (countData) {
//       console.log("Updated unread count:", countData.count);
//     } else {
//       console.error("Failed to receive count update");
//     }

//     // If we didn't get both, try the fallback approach with API
//     if (!notificationData || !countData) {
//       console.log("Trying API fallback for connection request...");
//       await testConnectionRequestNotificationViaAPI();
//     }
//   } catch (error) {
//     console.error("Connection request notification test failed:", error);
//     await testConnectionRequestNotificationViaAPI();
//   }
// //}

async function testConnectionRequestNotificationViaAPI() {
  // Set up listeners first
  const notificationPromise = waitForEvent(socket1, "new_notification", 10000);
  const countUpdatePromise = waitForEvent(socket1, "unread_notifications_count", 10000);

  // Trigger the connection request via API
  console.log("Simulating connection request from User2 to User1 via API...");
  try {
    const response = await fetch(`${SERVER_URL}/api/v1/user/connect/${USER2_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${createToken(USER1_ID)}`
      }
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`API request failed: ${response.status} ${text}`);
    }
  } catch (error) {
    console.error("API request error:", error);
  }

  try {
    // Wait for the notification and count update
    const [notificationData, countData] = await Promise.all([
      notificationPromise.catch(err => {
        console.error("API notification promise error:", err);
        return null;
      }), 
      countUpdatePromise.catch(err => {
        console.error("API count update promise error:", err);
        return null;
      })
    ]);

    if (notificationData) {
      console.log("Connection request notification received via API:", notificationData);
      notificationId = notificationData.id;
    } else {
      console.error("Failed to receive notification via API");
      throw new Error("Notification not received");
    }

    if (countData) {
      console.log("Updated unread count via API:", countData.count);
    }
  } catch (error) {
    console.error("Connection request notification via API test failed:", error);
    throw error;
  }
}

async function testCommentNotification() {
  console.log("Testing comment notification...");

  // Set up listener first
  const notificationPromise = waitForEvent(socket1, "new_notification", 10000);

  // Send notification directly
  socket3.emit("new_notification", {
    recipientId: USER1_ID,
    senderId: USER3_ID,
    type: NotificationType.COMMENT,
    content: "User3 commented on your post",
    referenceId: "680a40d0bafd765ce8e80a1d" // Mock post ID
  });

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

  // Set up listener first
  const notificationPromise = waitForEvent(socket1, "new_notification", 10000);

  // Send notification directly
  socket2.emit("new_notification", {
    recipientId: USER1_ID,
    senderId: USER2_ID,
    type: NotificationType.REACTED,
    content: "User2 liked your post",
    referenceId: "680a40d0bafd765ce8e80a1d" // Mock post ID
  });

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

  // Set up listener first
  const notificationPromise = waitForEvent(socket1, "new_notification", 10000);

  // Send notification directly
  socket3.emit("new_notification", {
    recipientId: USER1_ID,
    senderId: USER3_ID,
    type: NotificationType.MESSAGE,
    content: "Hello there!",
    referenceId: "67ff96187b8a31cde89096f0" // Mock conversation ID
  });

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

  if (!notificationId) {
    console.error("No notification ID available for read test");
    return;
  }

  // Set up listener first
  const countUpdatePromise = waitForEvent(socket1, "unread_notifications_count", 10000);

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

  // Set up listener first
  const countUpdatePromise = waitForEvent(socket1, "unread_notifications_count", 10000);

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

// Error Handling for Socket Events
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

  socket.on("authentication_error", (error) => {
    console.error(`${label} authentication error:`, error);
  });
}

// Main Test Function
async function runTests() {
  try {
    console.log("Starting notification system tests...");
    console.log(`Connecting to server at ${SERVER_URL}...`);

    // Initialize sockets with more aggressive timeout and retry options
    const socketOptions = {
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
      timeout: 20000,
      transports: ['websocket']
    };

    socket1 = io(SERVER_URL, socketOptions);
    socket2 = io(SERVER_URL, socketOptions);
    socket3 = io(SERVER_URL, socketOptions);

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
      waitForEvent(socket1, "connect", 10000),
      waitForEvent(socket2, "connect", 10000),
      waitForEvent(socket3, "connect", 10000)
    ]);

    console.log("All sockets connected");

    // Run test cases
    await testAuthentication();
    //await testConnectionRequestNotification();
    await testConnectionRequestNotificationViaAPI(); // Fallback to API if needed
    await testLikeNotification();
    await testCommentNotification();
    await testMessageNotification();
    await testMarkingNotificationAsRead();
    // await testMarkingAllNotificationsAsRead();

    console.log("All tests completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
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