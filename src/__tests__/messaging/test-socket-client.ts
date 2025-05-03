import { io, Socket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

dotenv.config();


// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// IMPORTANT: Ensure these match your server setup and database data
const SERVER_URL = "http://localhost:3000"; // Make sure this matches your server's port
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const USER1_ID = "testUserId"; // Use an actual user ID from your database
const USER2_ID = "User-30"; // Use another actual user ID
const USER3_ID = "User-31"; // <-- Add a third user ID

// NOTE: You'll need valid Conversation and Message IDs from your test database setup
// Ensure conversations exist between USER1_ID and USER2_ID, and between USER1_ID and USER3_ID
const TEST_CONVERSATION_ID_AB = "680fc1a9e88f5eabc097ef80"; // Conversation between User1 and User2
const TEST_MESSAGE_ID_AB = "680fc1aae88f5eabc097ef9a"; // A message ID within CONVERSATION_ID_AB

const TEST_CONVERSATION_ID_AC = "680fc1abe88f5eabc097efa5"; // <-- Conversation between User1 and User3
const TEST_MESSAGE_ID_AC = "680fc1ace88f5eabc097efbf"; // <-- A message ID within CONVERSATION_ID_AC

// Realistic message templates for different conversation contexts
const messageTemplates = {
  greeting: [
    "Hey there! How's your day going?",
    "Hi! I've been meaning to catch up with you.",
    "Hello! Do you have a moment to chat about the project?",
    "Hey, how are things with the new role?",
    "Good morning! Ready for today's meeting?"
  ],
  
  response: [
    "I'm doing well, thanks for asking! How about you?",
    "Great to hear from you! I've been pretty busy with the new project.",
    "Hey! Yes, I was just about to reach out about that.",
    "Things are going well! Just getting used to the new team structure.",
    "Morning! Yes, I've prepared the slides for the presentation."
  ],
  
  projectDiscussion: [
    "Have you had a chance to review the latest design mockups?",
    "What do you think about the approach we're taking with the API?",
    "I've been working on the database schema. Would you mind taking a look?",
    "The client suggested some changes to the UI. I've documented them in Figma.",
    "Do you think we should prioritize the mobile experience for this release?"
  ],
  
  technical: [
    "I'm having an issue with the authentication flow. The tokens aren't being stored correctly.",
    "Do you think we should switch to a microservices architecture for this component?",
    "The performance tests are showing some bottlenecks in the data processing pipeline.",
    "I've implemented the new caching layer we discussed. It improved response times by 40%!",
    "How would you handle the edge case where users try to access expired content?"
  ],
  
  mediaShare: [
    "I'm sending you the project documentation we discussed.",
    "Here's the presentation for tomorrow's meeting.",
    "Check out these reference designs I found - might be useful for our UI.",
    "I've attached the report with the latest analytics data.",
    "Here's the screenshot of the error I'm getting on production."
  ],
  
  closing: [
    "Thanks for your help with this! Really appreciate it.",
    "Let's catch up more about this tomorrow during the standup.",
    "Let me know if you need anything else from my side.",
    "I'll incorporate your feedback and send an updated version soon.",
    "Have a great rest of your day! Talk soon."
  ],
  
  professional: [
    "Could you share your thoughts on the market trends we're seeing?",
    "I'd value your perspective on how we should position the product.",
    "The board is asking for more detailed projections for Q4.",
    "Have you seen the latest industry report? Some interesting insights there.",
    "Our competitors just announced a new feature set. Should we respond?"
  ],
  
  casual: [
    "Did you watch the game last night? What a finish!",
    "How was your weekend getaway? Saw some great photos!",
    "Have you tried that new restaurant downtown?",
    "Any vacation plans coming up this summer?",
    "That book you recommended was amazing! Just finished it."
  ]
};

// Helper function to get a random message from a specific category
function getRandomMessage(category: keyof typeof messageTemplates): string {
  const templates = messageTemplates[category];
  return templates[Math.floor(Math.random() * templates.length)];
}

// Ensure test files exist and paths are correct relative to the test script
const testFiles = [
  resolve(__dirname, 'test-files/image.jpg'),
  resolve(__dirname, 'test-files/Hamza-Elghonemy-Resume.pdf'),
  // resolve(__dirname, 'test-files/video-sample.mp4'),
  // resolve(__dirname, 'test-files/test-document.docx')
];

// --- Helper Functions ---

// Create valid test tokens
const createToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
};

// Helper to wait for a specific socket event, with optional predicate
function waitForEvent(socket: Socket, eventName: string, timeout: number, predicate?: (data: any) => boolean): Promise<any>;
function waitForEvent(socket: Socket, eventName: string, timeout?: number): Promise<any>;
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

// Helper to listen for an event multiple times
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

// Helper to convert a file to a base64 data URL
function fileToBase64DataURL(filePath: string): string {
  try {
    const fileBuffer = readFileSync(filePath);
    const mimeType = getMimeType(filePath);
    const base64 = fileBuffer.toString('base64');
    if (!base64 || base64.length < 10 || base64.includes(' ')) {
         throw new Error("Base64 conversion resulted in invalid data.");
    }
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    throw error;
  }
}

// Helper to determine MIME type based on file extension
function getMimeType(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'mp4': return 'video/mp4';
    case 'mov': return 'video/quicktime';
    case 'pdf': return 'application/pdf';
    case 'txt': return 'text/plain';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default: return 'application/octet-stream';
  }
}

// --- Socket Connections ---
// Use autoConnect: false to control connection in tests
// Add reconnection: false to prevent auto-reconnect on disconnect

const socketOptions = {
  reconnectionDelayMax: 10000,
  reconnectionAttempts: 10,
  timeout: 20000,
  transports: ['websocket']
};

const socket1 = io(SERVER_URL, socketOptions );
const socket2 = io(SERVER_URL, socketOptions);
const socket3 = io(SERVER_URL, socketOptions); // <-- Socket for the third user


// --- Test Cases (using async/await) ---

async function testAuthenticationAndPresence() {
  console.log("Authenticating User1, User2, and User3 and testing initial presence...");

  // Connect the sockets manually now
  socket1.connect();
  socket2.connect();
  socket3.connect(); // <-- Connect socket3

  // Wait for connection before emitting authenticate
  await Promise.all([
      waitForEvent(socket1, "connect"),
      waitForEvent(socket2, "connect"),
      waitForEvent(socket3, "connect"), // <-- Wait for socket3 connection
  ]);
  console.log("All sockets connected.");

  // Listen for expected events *before* emitting authenticate
  const auth1Promise = waitForEvent(socket1, "authenticated");
  const auth2Promise = waitForEvent(socket2, "authenticated");
  const auth3Promise = waitForEvent(socket3, "authenticated"); // <-- Wait for socket3 auth

  // Expecting user_online events for all 3 users on all 3 sockets
  const onlineEventsOnSocket1 = listenForEvents(socket1, "user_online", 3); // Should receive 3 online events
  const onlineEventsOnSocket2 = listenForEvents(socket2, "user_online", 3); // Should receive 3 online events
  const onlineEventsOnSocket3 = listenForEvents(socket3, "user_online", 3); // Should receive 3 online events

   // Optional: Listen for initial unread counts if your service sends them on auth
   const unreadCount1Promise = waitForEvent(socket1, "unread_messages_count");
   const unreadCount2Promise = waitForEvent(socket2, "unread_messages_count");
   const unreadCount3Promise = waitForEvent(socket3, "unread_messages_count"); // <-- Wait for socket3 unread count


  socket1.emit("authenticate", { token: createToken(USER1_ID) });
  socket2.emit("authenticate", { token: createToken(USER2_ID) });
  socket3.emit("authenticate", { token: createToken(USER3_ID) }); // <-- Authenticate socket3

  // Wait for authentication and online events on all sockets
  await Promise.all([
    auth1Promise,
    auth2Promise,
    auth3Promise, // <-- Await socket3 auth
    onlineEventsOnSocket1,
    onlineEventsOnSocket2,
    onlineEventsOnSocket3, // <-- Await socket3 online events
    unreadCount1Promise,
    unreadCount2Promise,
    unreadCount3Promise, // <-- Await socket3 unread count
  ]);
  console.log("All users authenticated and initial presence status verified.");
}

async function testMessageExchange() {
  console.log("Testing message exchange (User1 <-> User2)...");

  // User2 waits for a new message from User1
  const messagePromise = waitForEvent(socket2, "new_message", 10000, (data: any) =>
    data.senderId === USER1_ID && data.conversationId === TEST_CONVERSATION_ID_AB
  );

  // User1 sends a more realistic greeting message to User2
  const greeting = getRandomMessage("greeting");
  socket1.emit("private_message", {
    to: USER2_ID,
    message: greeting,
  });

  // Wait for the message to be received by User2
  const receivedMessage = await messagePromise;
  console.log("User2 received message:", receivedMessage.message.message);

  // Now User2 sends a realistic response back to User1
  const responsePromise = waitForEvent(socket1, "new_message", 10000, (data: any) =>
    data.senderId === USER2_ID && data.conversationId === TEST_CONVERSATION_ID_AB
  );
  
  const responseMsg = getRandomMessage("response");
  socket2.emit("private_message", {
    to: USER1_ID,
    message: responseMsg,
  });
  
  const receivedResponse = await responsePromise;
  console.log("User1 received response:", receivedResponse.message.message);
}


async function testMultipleConversations() {
    console.log("Testing multiple conversations (User1 <-> User3) and isolation...");

    // --- Test Message Isolation ---
    console.log("Testing message isolation...");
    // User3 waits for message from User1 (in A-C conversation)
    const messageACTo3Promise = waitForEvent(socket3, "new_message", 10000, (data: any) =>
        data.senderId === USER1_ID && data.conversationId === TEST_CONVERSATION_ID_AC
    );
    // User2 should NOT receive this message
    const messageACNotTo2Promise = new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 1000); // Wait briefly to see if socket2 gets the event
        socket2.once("new_message", (data) => {
            clearTimeout(timer);
            if (data.conversationId === TEST_CONVERSATION_ID_AC) {
                reject(new Error(`User2 incorrectly received message from conversation ${TEST_CONVERSATION_ID_AC}`));
            } else {
                resolve(data); // Received a message, but not from the AC conversation, which is fine
            }
        });
    });

    // User1 sends a technical discussion message to User3
    const technicalMsg = getRandomMessage("technical");
    socket1.emit("private_message", {
        to: USER3_ID,
        message: technicalMsg,
    });

    // Wait for User3 to receive the message and confirm User2 did not
    await Promise.all([messageACTo3Promise, messageACNotTo2Promise]);
    console.log("User3 received message from User1 in AC conversation. User2 did NOT receive it.");


    // --- Test Typing Indicator Isolation ---
    console.log("Testing typing indicator isolation...");
    // User3 waits for typing indicator from User1 (in A-C conversation)
    const typingACTo3Promise = waitForEvent(socket3, "user_typing", 5000, (data: any) =>
        data.userId === USER1_ID && data.conversationId === TEST_CONVERSATION_ID_AC
    );
     // User2 should NOT receive this typing indicator from the AC conversation
    const typingACNotTo2Promise = new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 1000); // Wait briefly
        socket2.once("user_typing", (data) => {
            clearTimeout(timer);
             if (data.conversationId === TEST_CONVERSATION_ID_AC) {
                reject(new Error(`User2 incorrectly received typing indicator from conversation ${TEST_CONVERSATION_ID_AC}`));
            } else {
                 resolve(data); // Received a typing indicator, but not from AC conversation, which is fine
             }
        });
    });

    // User1 starts typing in A-C conversation
    socket1.emit("typing", { conversationId: TEST_CONVERSATION_ID_AC });

    // Wait for User3 to get the typing indicator and confirm User2 didn't
    await Promise.all([typingACTo3Promise, typingACNotTo2Promise]);
    console.log("User3 received typing indicator from User1 in AC conversation. User2 did NOT receive it.");

     // Clean up the typing indicator timeout on the server by stopping typing
     socket1.emit("stop_typing", { conversationId: TEST_CONVERSATION_ID_AC });
     // Optional: Wait for stop_typing confirmation on socket3 if needed

     // Test stop typing isolation similarly
     const stopTypingACTo3Promise = waitForEvent(socket3, "user_stop_typing", 5000, (data: any) =>
         data.userId === USER1_ID && data.conversationId === TEST_CONVERSATION_ID_AC
     );
      const stopTypingACNotTo2Promise = new Promise((resolve, reject) => {
         const timer = setTimeout(resolve, 1000); // Wait briefly
         socket2.once("user_stop_typing", (data) => {
             clearTimeout(timer);
              if (data.conversationId === TEST_CONVERSATION_ID_AC) {
                 reject(new Error(`User2 incorrectly received stop typing indicator from conversation ${TEST_CONVERSATION_ID_AC}`));
             } else {
                  resolve(data); // Received stop typing, but not from AC conversation, which is fine
              }
         });
     });
     await Promise.all([stopTypingACTo3Promise, stopTypingACNotTo2Promise]);
     console.log("User3 received stop typing indicator from User1 in AC conversation. User2 did NOT receive it.");


     // --- Test Reaction Isolation ---
     console.log("Testing reaction isolation...");
     // User3 waits for reaction from User1 (in A-C conversation on a specific message)
     const reactionACTo3Promise = waitForEvent(socket3, "message_reacted", 5000, (data: any) =>
         data.reactedBy === USER1_ID && data.conversationId === TEST_CONVERSATION_ID_AC && data.messageId === TEST_MESSAGE_ID_AC
     );
      // User2 should NOT receive this reaction from the AC conversation
     const reactionACNotTo2Promise = new Promise((resolve, reject) => {
         const timer = setTimeout(resolve, 1000); // Wait briefly
         socket2.once("message_reacted", (data) => {
             clearTimeout(timer);
              if (data.conversationId === TEST_CONVERSATION_ID_AC) {
                 reject(new Error(`User2 incorrectly received reaction from conversation ${TEST_CONVERSATION_ID_AC}`));
             } else {
                 resolve(data); // Received a reaction, but not from AC conversation, which is fine
             }
         });
     });

     // User1 reacts to a message in the A-C conversation
     socket1.emit("react_to_message", {
         conversationId: TEST_CONVERSATION_ID_AC,
         messageId: TEST_MESSAGE_ID_AC,
         reaction: "heart" // Use a different reaction or like
     });

     // Wait for User3 to get the reaction and confirm User2 didn't
     await Promise.all([reactionACTo3Promise, reactionACNotTo2Promise]);
     console.log("User3 received reaction from User1 in AC conversation. User2 did NOT receive it.");


    // --- Test Read Receipt Isolation ---
    console.log("Testing read receipt isolation...");
     // User3 waits for read receipt from User1 (in A-C conversation)
     const readReceiptACTo3Promise = waitForEvent(socket3, "messages_read", 5000, (data: any) =>
         data.readBy === USER1_ID && data.conversationId === TEST_CONVERSATION_ID_AC
     );
      // User2 should NOT receive this read receipt from the AC conversation
     const readReceiptACNotTo2Promise = new Promise((resolve, reject) => {
         const timer = setTimeout(resolve, 1000); // Wait briefly
         socket2.once("messages_read", (data) => {
             clearTimeout(timer);
             if (data.conversationId === TEST_CONVERSATION_ID_AC) {
                 reject(new Error(`User2 incorrectly received read receipt from conversation ${TEST_CONVERSATION_ID_AC}`));
             } else {
                 resolve(data); // Received a read receipt, but not from AC conversation, which is fine
             }
         });
     });


    // User1 marks conversation A-C as read
    socket1.emit("mark_as_read", { conversationId: TEST_CONVERSATION_ID_AC });

     // Wait for User3 to get the read receipt and confirm User2 didn't
     await Promise.all([readReceiptACTo3Promise, readReceiptACNotTo2Promise]);
    console.log("User3 received read receipt from User1 in AC conversation. User2 did NOT receive it.");

    // Optional: Test unread counts reflect messages from both conversations
    // This is more complex and would require sending unread messages in AB and AC
    // and then checking the total count reported to socket1.

}


async function testMediaMessageExchange() {
  console.log("Testing message exchange with real files (User1 <-> User2)...");

  // Log file details before sending
  testFiles.forEach((filePath) => {
    try {
      const stats = statSync(filePath);
      console.log(`File: ${filePath}, Size: ${stats.size} bytes, MIME: ${getMimeType(filePath)}`);
    } catch (error) {
      console.error(`Could not get info for file: ${filePath}`, error);
      // Depending on your needs, you might want to throw or skip this file
    }
  });


  // Convert files to base64 data URLs
  const media = testFiles.map(fileToBase64DataURL);

  // User1 sends message with real files to User2
  const mediaMessagePromise = waitForEvent(socket2, "new_message", 20000, (data: any) =>
    data.senderId === USER1_ID && data.conversationId === TEST_CONVERSATION_ID_AB && data.message?.media?.length > 0
  );

  // Use a more natural media sharing message
  const mediaMessage = getRandomMessage("mediaShare");
  socket1.emit("private_message", {
    to: USER2_ID, // Sending to User2
    message: mediaMessage,
    media: media
  });

  // Wait for the message with media to be received by User2
  const receivedMediaMessage = await mediaMessagePromise;
  console.log("User2 received message with media:", receivedMediaMessage.message.media);

  // Add validation for received media URLs
  if (receivedMediaMessage.message.media && Array.isArray(receivedMediaMessage.message.media)) {
    console.log('Received media URLs validation:');
    receivedMediaMessage.message.media.forEach((url: string, index: number) => {
      const isValid = url.startsWith('http'); // Basic check
      console.log(`Media ${index + 1}: ${url.substring(0, 50)}... - Valid URL format: ${isValid ? '✅' : '❌'}`);
      if (!isValid) throw new Error(`Received invalid media URL: ${url}`);
    });
  } else {
    throw new Error("No media or invalid media format received in media message.");
  }

   // Optional: Ensure socket3 does NOT receive this message
    const mediaACNotTo3Promise = new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 1000); // Wait briefly
        socket3.once("new_message", (data) => {
            clearTimeout(timer);
             if (data.conversationId === TEST_CONVERSATION_ID_AB) {
                reject(new Error(`User3 incorrectly received media message from conversation ${TEST_CONVERSATION_ID_AB}`));
            } else {
                 resolve(data); // Received a message, but not from AB conversation, which is fine
             }
        });
    });
    await mediaACNotTo3Promise;
    console.log("User3 did NOT receive media message from AB conversation.");
}


async function testTypingIndicators() {
  console.log("Testing typing indicators (User1 <-> User2)...");

  // User2 waits for typing indicator from User1
  const typingPromise = waitForEvent(socket2, "user_typing", 5000, (data: any) => data.userId === USER1_ID && data.conversationId === TEST_CONVERSATION_ID_AB);
  const stopTypingPromise = waitForEvent(socket2, "user_stop_typing", 5000, (data: any) => data.userId === USER1_ID && data.conversationId === TEST_CONVERSATION_ID_AB);

  // User1 starts typing in AB conversation
  socket1.emit("typing", { conversationId: TEST_CONVERSATION_ID_AB });

  // Wait for User2 to receive the typing event
  await typingPromise;
  console.log("User2 received typing indicator from User1.");

  // Wait a bit (less than the server's timeout) and then stop typing
  await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
  socket1.emit("stop_typing", { conversationId: TEST_CONVERSATION_ID_AB });

  // Wait for User2 to receive the stop typing event
  await stopTypingPromise;
  console.log("User2 received stop typing indicator from User1.");

  // Optional: Test automatic stop typing after server timeout for AB conversation
  console.log("Testing automatic stop typing for AB (wait for server timeout)...");
   const autoStopTypingPromise = waitForEvent(socket2, "user_stop_typing", 4000, (data: any) => data.userId === USER1_ID && data.conversationId === TEST_CONVERSATION_ID_AB); // Server timeout is 3s, wait a bit more

   socket1.emit("typing", { conversationId: TEST_CONVERSATION_ID_AB });
   console.log("User1 started typing again for AB auto-stop test.");

   // Wait for the server's typing timeout and the subsequent auto-stop event
   await autoStopTypingPromise;
   console.log("User2 received automatic stop typing indicator for AB.");
}

async function testMessageReactions() {
  console.log("Testing message reactions (User1 <-> User2)...");

  // User1 waits for reaction event from User2 on the specific message and reaction
  const reactionPromise = waitForEvent(socket1, "message_reacted", 5000, (data: any) =>
    data.messageId === TEST_MESSAGE_ID_AB && data.reaction === "like" && data.reactedBy === USER2_ID
  );

  // User2 reacts to a message in AB conversation
  socket2.emit("react_to_message", {
    conversationId: TEST_CONVERSATION_ID_AB,
    messageId: TEST_MESSAGE_ID_AB,
    reaction: "like"
  });

  // Wait for User1 to receive the reaction event
  const reactionData = await reactionPromise;
  console.log(`User1 received reaction '${reactionData.reaction}' on message ${reactionData.messageId} by user ${reactionData.reactedBy}.`);
}

async function testReadReceipts() {
  console.log("Testing read receipts (User1 <-> User2)...");

  // User1 waits for messages read event from User2 for the specific conversation
  const readReceiptPromise = waitForEvent(socket1, "messages_read", 5000, (data: any) =>
    data.conversationId === TEST_CONVERSATION_ID_AB && data.readBy === USER2_ID
  );

  // User2 waits for their unread count to update after marking as read
  const unreadCountUpdate2Promise = waitForEvent(socket2, "unread_messages_count", 5000);

  // User2 marks conversation AB as read
  socket2.emit("mark_as_read", {
    conversationId: TEST_CONVERSATION_ID_AB
  });

  // Wait for User1 to receive the read receipt and User2 to receive their unread count update
  const [readReceiptData, unreadCountData2] = await Promise.all([readReceiptPromise, unreadCountUpdate2Promise]);

  console.log(`User1 received read receipt for conversation ${readReceiptData.conversationId} by user ${readReceiptData.readBy}.`);
  console.log(`User2 received unread count update: ${unreadCountData2.count}`);

  // Optional: Test User1 marking as read and waiting for their own count update
  console.log("User1 marking conversation AB as read...");
  const unreadCountUpdate1Promise = waitForEvent(socket1, "unread_messages_count", 5000);
  socket1.emit("mark_as_read", {
    conversationId: TEST_CONVERSATION_ID_AB,
  });
  const unreadCountData1 = await unreadCountUpdate1Promise;
  console.log(`User1 received unread count update: ${unreadCountData1.count}`);
}

// New test function for realistic conversation flow
async function testRealisticConversationFlow() {
  console.log("Testing realistic conversation flow between User1 and User2...");

  // First message from User1 - greeting
  const greeting = getRandomMessage("greeting");
  console.log(`[User1 → User2]: ${greeting}`);
  const greetingPromise = waitForEvent(socket2, "new_message", 5000);
  socket1.emit("private_message", {
    to: USER2_ID,
    message: greeting,
  });
  await greetingPromise;
  
  // User2 responds with a response
  const response = getRandomMessage("response");
  console.log(`[User2 → User1]: ${response}`);
  const responsePromise = waitForEvent(socket1, "new_message", 5000);
  socket2.emit("private_message", {
    to: USER1_ID,
    message: response,
  });
  await responsePromise;
  
  // User1 follows up with project discussion
  const projectMsg = getRandomMessage("projectDiscussion");
  console.log(`[User1 → User2]: ${projectMsg}`);
  const projectPromise = waitForEvent(socket2, "new_message", 5000);
  socket1.emit("private_message", {
    to: USER2_ID,
    message: projectMsg,
  });
  await projectPromise;
  
  // User2 responds with technical details
  const technicalMsg = getRandomMessage("technical");
  console.log(`[User2 → User1]: ${technicalMsg}`);
  const technicalPromise = waitForEvent(socket1, "new_message", 5000);
  socket2.emit("private_message", {
    to: USER1_ID,
    message: technicalMsg,
  });
  await technicalPromise;
  
  // User1 acknowledges with closing message
  const closingMsg = getRandomMessage("closing");
  console.log(`[User1 → User2]: ${closingMsg}`);
  const closingPromise = waitForEvent(socket2, "new_message", 5000);
  socket1.emit("private_message", {
    to: USER2_ID,
    message: closingMsg,
  });
  await closingPromise;
  
  console.log("Realistic conversation flow completed successfully");
}

async function testDisconnection() {
  console.log("Testing disconnection (User1)...");

  // User2 waits for User1 to go offline
  const offlinePromise2 = waitForEvent(socket2, "user_offline", 5000, (data: any) => data.userId === USER1_ID);
  // User3 waits for User1 to go offline
  const offlinePromise3 = waitForEvent(socket3, "user_offline", 5000, (data: any) => data.userId === USER1_ID);


  // Socket1 waits for its own local disconnect event
  const disconnectPromise1 = waitForEvent(socket1, "disconnect", 5000);

  // Initiate disconnection from client side for socket1
  console.log("Initiating socket1 disconnection...");
  socket1.disconnect();

  // Wait for the offline notification on socket2 & socket3 AND the local disconnect event on socket1
  await Promise.all([offlinePromise2, offlinePromise3, disconnectPromise1]);

  console.log("User2 and User3 received user offline event for User1, and Socket 1 confirmed disconnection.");

  // Optional: Wait for socket2 and socket3 disconnections if you were testing server shutdown
  // await waitForEvent(socket2, "disconnect", 5000);
  // await waitForEvent(socket3, "disconnect", 5000);
}

// --- Error Handling Tests ---

async function testAuthenticationError() {
  console.log("Testing authentication error with invalid token...");
  // Create a temporary socket that won't interfere with subsequent tests
  const tempSocket = io(SERVER_URL, { transports: ["websocket"], autoConnect: false, reconnection: false });
   tempSocket.connect();
   await waitForEvent(tempSocket, "connect", 5000);

  const errorPromise = waitForEvent(tempSocket, "authentication_error", 5000);
  tempSocket.emit("authenticate", { token: "invalid_token" });
  const errorData = await errorPromise;
  console.log("Received authentication error as expected:", errorData.message);
  tempSocket.disconnect(); // Clean up temporary socket
   await waitForEvent(tempSocket, "disconnect", 5000).catch(() => {}); // Wait for disconnect, ignore errors if already disconnected
}

async function testMessageError_Unauthorized() {
  console.log("Testing message error for unauthorized user...");
  // Create a temporary socket that is connected but not authenticated
  const tempSocket = io(SERVER_URL, { transports: ["websocket"], autoConnect: false, reconnection: false });
  tempSocket.connect();
  await waitForEvent(tempSocket, "connect", 5000);

  const errorPromise = waitForEvent(tempSocket, "message_error", 5000);

  // Emit a private message without authenticating
  tempSocket.emit("private_message", {
    to: USER2_ID,
    message: "This should fail!",
  });

  const errorData = await errorPromise;
  console.log("Received message error for unauthorized user as expected:", errorData.message);
  tempSocket.disconnect(); // Clean up temp socket
  await waitForEvent(tempSocket, "disconnect", 5000).catch(() => {}); // Wait for disconnect, ignore errors
}

async function testMessageError_InvalidMedia() {
  console.log("Testing message error with invalid media format...");
  const errorPromise = waitForEvent(socket1, "message_error", 5000);

  // Send a message with invalid media (e.g., not starting with data:)
  socket1.emit("private_message", {
    to: USER2_ID,
    message: "Here's a screenshot of the error I'm getting. Could you take a look?",
    media: ["not_a_data_url"]
  });

  const errorData = await errorPromise;
  console.log("Received message error for invalid media as expected:", errorData.message);
}


async function testMessageError_TooMuchMedia() {
  console.log("Testing message error with too many media files...");
  const errorPromise = waitForEvent(socket1, "message_error", 5000);

  // Create more than 5 dummy base64 strings (just need the format)
  const excessiveMedia = Array(6).fill("data:image/png;base64,fakebase64data");

  socket1.emit("private_message", {
    to: USER2_ID,
    message: "I've got multiple screenshots of our app flow to share with you.",
    media: excessiveMedia
  });

  const errorData = await errorPromise;
  console.log("Received message error for too many media files as expected:", errorData.message);
}

// --- Test Runner ---

// Array of test cases to run sequentially
const testCases = [
  { name: "Authentication and Initial Presence", func: testAuthenticationAndPresence },
  { name: "Message Exchange (User1 <-> User2)", func: testMessageExchange },
  { name: "Multiple Conversations (User1 <-> User3) & Isolation", func: testMultipleConversations },
  { name: "Realistic Conversation Flow", func: testRealisticConversationFlow },
  { name: "Media Message Exchange (User1 <-> User2)", func: testMediaMessageExchange },
  { name: "Typing Indicators (User1 <-> User2)", func: testTypingIndicators },
  { name: "Message Reactions (User1 <-> User2)", func: testMessageReactions },
  { name: "Read Receipts (User1 <-> User2)", func: testReadReceipts },
  { name: "Authentication Error (Invalid Token)", func: testAuthenticationError },
  { name: "Message Error (Unauthorized)", func: testMessageError_Unauthorized },
  { name: "Message Error (Invalid Media Format)", func: testMessageError_InvalidMedia },
  { name: "Message Error (Too Much Media)", func: testMessageError_TooMuchMedia },
  { name: "Disconnection (User1)", func: testDisconnection },
];

// Main test runner function
async function runTestsSequentially() {
  console.log("Starting comprehensive WebSocket test client...");
  let passCount = 0;
  let failCount = 0;
  
  for (const testCase of testCases) {
    console.log(`\n=== Running test: ${testCase.name} ===`);
    try {
      await testCase.func();
      console.log(`=== Test "${testCase.name}" PASSED ===`);
      passCount++;
    } catch (error) {
      console.error(`=== Test "${testCase.name}" FAILED ===`);
      console.error(error);
      failCount++;
      // Stop execution on first failure
      gracefulShutdown(1); // Exit with a non-zero code to indicate failure
      return;
    }
  }

  console.log("\n=== Test Summary ===");
  console.log(`Passed: ${passCount}/${testCases.length}`);
  console.log(`Failed: ${failCount}/${testCases.length}`);
  console.log("\nAll tests completed successfully!");
  gracefulShutdown(0); // Exit with code 0 for success
}


// --- Cleanup ---

function gracefulShutdown(exitCode = 0) {
  console.log("\nClosing socket connections...");
  // Disconnect all sockets
  if (socket1 && socket1.connected) {
      socket1.disconnect();
      console.log("Socket 1 disconnected initiated.");
  }
  if (socket2 && socket2.connected) {
      socket2.disconnect();
      console.log("Socket 2 disconnected initiated.");
  }
  if (socket3 && socket3.connected) { // <-- Disconnect socket3
      socket3.disconnect();
      console.log("Socket 3 disconnected initiated.");
  }


  // Give sockets a moment to disconnect before exiting
  setTimeout(() => {
       console.log("Exiting test process.");
       process.exit(exitCode);
  }, 500); // Adjust timeout if needed
}

// Handle process termination signals
process.on("SIGINT", () => gracefulShutdown(1));
process.on("SIGTERM", () => gracefulShutdown(1));


// --- Initial Setup and Start ---

// Start the test runner. Sockets will connect in the first test case.
runTestsSequentially();


// --- Socket Event Loggers (for debugging) ---
// These handlers log events but do NOT control the test flow.
// The test flow is controlled by async/await and waitForEvent in the test functions.

socket1.on("connect", () => console.log("Socket 1 connected with ID:", socket1.id));
socket1.on("disconnect", (reason) => console.log(`Socket 1 disconnected. Reason: ${reason}`));
socket1.on("authenticated", (data) => console.log("User1 - authenticated:", data));
socket1.on("authentication_error", (err) => console.error("User1 - authentication_error:", err));
socket1.on("message_sent", (data) => console.log("User1 - message_sent confirmation:", data.message?.message || 'Media message'));
socket1.on("new_message", (data) => {
  console.log(`User1 - new_message received (Conv: ${data.conversationId}): ${data.message?.message || 'Media message'}`);
  if (data.message && data.message.media) {
    console.log("User1 - new_message received media:", data.message.media.length, "files");
  }
});
socket1.on("user_online", (data) => console.log("User1 - user_online:", data.userId));
socket1.on("user_offline", (data) => console.log("User1 - user_offline:", data.userId));
socket1.on("user_typing", (data) => console.log(`User1 - user_typing: ${data.userId} in conv ${data.conversationId}`));
socket1.on("user_stop_typing", (data) => console.log(`User1 - user_stop_typing: ${data.userId} in conv ${data.conversationId}`));
socket1.on("message_reacted", (data) => console.log(`User1 - message_reacted (Conv: ${data.conversationId}):`, data));
socket1.on("messages_read", (data) => console.log(`User1 - messages_read (Conv: ${data.conversationId}):`, data));
socket1.on("unread_messages_count", (data) => console.log("User1 - unread_messages_count:", data.count));


socket2.on("connect", () => console.log("Socket 2 connected with ID:", socket2.id));
socket2.on("disconnect", (reason) => console.log(`Socket 2 disconnected. Reason: ${reason}`));
socket2.on("authenticated", (data) => console.log("User2 - authenticated:", data));
socket2.on("authentication_error", (err) => console.error("User2 - authentication_error:", err));
socket2.on("message_sent", (data) => console.log("User2 - message_sent confirmation:", data.message?.message || 'Media message'));
socket2.on("new_message", (data) => {
  console.log(`User2 - new_message received (Conv: ${data.conversationId}): ${data.message?.message || 'Media message'}`);
   if (data.message && data.message.media) {
    console.log("User2 - new_message received media:", data.message.media.length, "files");
  }
});
socket2.on("user_online", (data) => console.log("User2 - user_online:", data.userId));
socket2.on("user_offline", (data) => console.log("User2 - user_offline:", data.userId));
socket2.on("user_typing", (data) => console.log(`User2 - user_typing: ${data.userId} in conv ${data.conversationId}`));
socket2.on("user_stop_typing", (data) => console.log(`User2 - user_stop_typing: ${data.userId} in conv ${data.conversationId}`));
socket2.on("message_reacted", (data) => console.log(`User2 - message_reacted (Conv: ${data.conversationId}):`, data));
socket2.on("messages_read", (data) => console.log(`User2 - messages_read (Conv: ${data.conversationId}):`, data));
socket2.on("unread_messages_count", (data) => console.log("User2 - unread_messages_count:", data.count));


// <-- Add logger for socket3 -->
socket3.on("connect", () => console.log("Socket 3 connected with ID:", socket3.id));
socket3.on("disconnect", (reason) => console.log(`Socket 3 disconnected. Reason: ${reason}`));
socket3.on("authenticated", (data) => console.log("User3 - authenticated:", data));
socket3.on("authentication_error", (err) => console.error("User3 - authentication_error:", err));
socket3.on("message_sent", (data) => console.log("User3 - message_sent confirmation:", data.message?.message || 'Media message'));
socket3.on("new_message", (data) => {
  console.log(`User3 - new_message received (Conv: ${data.conversationId}): ${data.message?.message || 'Media message'}`);
   if (data.message && data.message.media) {
    console.log("User3 - new_message received media:", data.message.media.length, "files");
  }
});
socket3.on("user_online", (data) => console.log("User3 - user_online:", data.userId));
socket3.on("user_offline", (data) => console.log("User3 - user_offline:", data.userId));
socket3.on("user_typing", (data) => console.log(`User3 - user_typing: ${data.userId} in conv ${data.conversationId}`));
socket3.on("user_stop_typing", (data) => console.log(`User3 - user_stop_typing: ${data.userId} in conv ${data.conversationId}`));
socket3.on("message_reacted", (data) => console.log(`User3 - message_reacted (Conv: ${data.conversationId}):`, data));
socket3.on("messages_read", (data) => console.log(`User3 - messages_read (Conv: ${data.conversationId}):`, data));
socket3.on("unread_messages_count", (data) => console.log("User3 - unread_messages_count:", data.count));


// General error handlers
[socket1, socket2, socket3].forEach((socket, index) => { // <-- Add socket3 to error handlers
  socket.on("error", (err) => console.error(`Socket ${index + 1} general error:`, err));
  socket.on("message_error", (err) => console.error(`Socket ${index + 1} message_error:`, err));
  socket.on("reaction_error", (err) => console.error(`Socket ${index + 1} reaction_error:`, err));
  socket.on("read_error", (err) => console.error(`Socket ${index + 1} read_error:`, err));
});