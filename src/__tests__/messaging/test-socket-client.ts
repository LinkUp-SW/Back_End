import { io, Socket } from "socket.io-client";
import jwt from "jsonwebtoken";

// Configuration
const SERVER_URL = "http://localhost:3000";
const JWT_SECRET = "3d9958c671ac65ef6a7de05337c862fb1bc347264dbd12a604a673ca9a69855cf1b15bda3bc6ceee92c85f643fc2be8caeb172a15be90a70080e6569c068aab1";
const USER1_ID = "testUserId";
const USER2_ID = "otherUserId";
const TEST_CONVERSATION_ID = "67ec84c3a33cad665c1e860e";
const TEST_MESSAGE_ID = "67ee04a8e9a71c78dd5faec9";

// Create valid test tokens
const createToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
};

// Create socket connections
const socket1 = io(SERVER_URL);
const socket2 = io(SERVER_URL);

// Test state
let testStep = 0;
const testCases = [
  { name: "Authentication", func: testAuthentication },
  { name: "Presence Status", func: testPresenceStatus },
  { name: "Message Exchange", func: testMessageExchange },
  { name: "Typing Indicators", func: testTypingIndicators },
  { name: "Message Reactions", func: testMessageReactions },
  { name: "Read Receipts", func: testReadReceipts },
  { name: "Disconnection", func: testDisconnection }
];

console.log("Starting comprehensive WebSocket test client...");

// Main test runner
function runTests() {
  if (testStep < testCases.length) {
    console.log(`\n=== Running test: ${testCases[testStep].name} ===`);
    testCases[testStep].func();
  } else {
    console.log("\nAll tests completed!");
    gracefulShutdown();
  }
}

// Test Cases
function testAuthentication() {
  console.log("Authenticating User1...");
  socket1.emit("authenticate", { token: createToken(USER1_ID) });
  socket2.emit("authenticate", { token: createToken(USER2_ID) });
}

function testPresenceStatus() {
  console.log("Testing online status...");
  socket1.emit("online", { userId: USER1_ID });
  setTimeout(() => {
    socket2.emit("online", { userId: USER2_ID });
    nextTest();
  }, 1000);
}

function testMessageExchange() {
  console.log("Testing message exchange...");
  
  // User1 sends message to User2
  socket1.emit("private_message", {
    to: USER2_ID,
    message: "Hello from User1!",
    media: ["media1.jpg", "media2.png"]
  });

  // User2 replies
  setTimeout(() => {
    socket2.emit("private_message", {
      to: USER1_ID,
      message: "Reply from User2!"
    });
    nextTest();
  }, 1500);
}

function testTypingIndicators() {
  console.log("Testing typing indicators...");
  
  // User1 starts typing
  socket1.emit("typing", { conversationId: TEST_CONVERSATION_ID });
  
  // User1 stops typing after 2 seconds
  setTimeout(() => {
    socket1.emit("stop_typing", { conversationId: TEST_CONVERSATION_ID });
    nextTest();
  }, 2000);
}

function testMessageReactions() {
  console.log("Testing message reactions...");
  
  // User2 reacts to a message
  socket2.emit("react_to_message", {
    conversationId: TEST_CONVERSATION_ID,
    messageId: TEST_MESSAGE_ID,
    reaction: "like"
  });
  
  setTimeout(nextTest, 1000);
}

function testReadReceipts() {
  console.log("Testing read receipts...");
  
  // User2 marks conversation as read
  socket2.emit("mark_as_read", {
    conversationId: TEST_CONVERSATION_ID
  });

  // User1 marks messages as read
  setTimeout(() => {
    socket1.emit("mark_as_read", {
      conversationId: TEST_CONVERSATION_ID,
    });
  }, 1000);
  
  setTimeout(nextTest, 1000);
}

function testDisconnection() {
  console.log("Testing disconnection...");
  
  // User1 goes offline
  socket1.emit("offline", { userId: USER1_ID });
  
  setTimeout(() => {
    socket1.disconnect();
    nextTest();
  }, 1000);
}

// Helper functions
function nextTest() {
  testStep++;
  setTimeout(runTests, 500);
}

function gracefulShutdown() {
  console.log("\nClosing socket connections...");
  socket1.disconnect();
  socket2.disconnect();
  process.exit(0);
}

// Event handlers for socket1 (User1)
socket1.on("connect", () => {
  console.log("Socket 1 connected with ID:", socket1.id);
  runTests();
});

socket1.on("authenticated", (data) => {
  console.log("User1 authenticated successfully! User ID:", data.userId);
  nextTest();
});

socket1.on("message_sent", (data) => {
  console.log("User1 - Message sent confirmation:", {
    conversationId: data.conversationId,
    message: data.message.message
  });
});

socket1.on("user_online", (data) => {
  console.log("User1 - User came online:", data.userId);
});

socket1.on("user_offline", (data) => {
  console.log("User1 - User went offline:", data.userId);
});

socket1.on("new_message", (data) => {
  console.log("User1 - New message received:", {
    from: data.senderId,
    message: data.message.message
  });
});

socket1.on("message_reacted", (data) => {
  console.log("User1 - Message reaction:", {
    messageId: data.messageId,
    reaction: data.reaction,
    reactedBy: data.reactedBy
  });
});

socket1.on("messages_read", (data) => {
  console.log("User1 - Messages read by:", data.readBy);
});

// Event handlers for socket2 (User2)
socket2.on("connect", () => {
  console.log("Socket 2 connected with ID:", socket2.id);
});

socket2.on("authenticated", (data) => {
  console.log("User2 authenticated successfully! User ID:", data.userId);
});

socket2.on("message_sent", (data) => {
  console.log("User2 - Message sent confirmation:", {
    conversationId: data.conversationId,
    message: data.message.message
  });
});

socket2.on("new_message", (data) => {
  console.log("User2 - New message received:", {
    from: data.senderId,
    message: data.message.message
  });
});

socket2.on("user_typing", (data) => {
  console.log("User2 - User is typing in conversation:", data.conversationId);
});

socket2.on("user_stop_typing", (data) => {
  console.log("User2 - User stopped typing in conversation:", data.conversationId);
});

socket2.on("messages_read", (data) => {
  console.log("User2 - Messages read by:", data.readBy);
});

// Error handlers
[socket1, socket2].forEach((socket, index) => {
  socket.on("error", (err) => {
    console.error(`Socket ${index + 1} error:`, err);
  });

  socket.on("authentication_error", (err) => {
    console.error(`Socket ${index + 1} auth error:`, err);
  });

  socket.on("message_error", (err) => {
    console.error(`Socket ${index + 1} message error:`, err);
  });

  socket.on("reaction_error", (err) => {
    console.error(`Socket ${index + 1} reaction error:`, err);
  });

  socket.on("read_error", (err) => {
    console.error(`Socket ${index + 1} read receipt error:`, err);
  });
});

// Handle process termination
process.on("SIGINT", gracefulShutdown);