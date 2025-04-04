import mongoose from "mongoose";
import users from "../models/users.model.ts";
import conversations from "../models/conversations.model.ts";
import { connectToTestDatabase, disconnectFromDatabase } from "../../config/database.ts";
import { accountStatusEnum, invitationsEnum, statusEnum } from "../models/users.model.ts";
import bcrypt from "bcrypt";

// populate conversations and messages
const populateConversations = async () => {
    try {
        // Connect to MongoDB
        await connectToTestDatabase()
        console.log("Connected to database");

        // Find the user by user_id
        let user = await users.findOne({ user_id: "testUserId" });
        
        // Create the test user if it doesn't exist
        if (!user) {
            console.log("Test user not found, creating one...");
            
            // Generate hashed password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash("testPassword123", salt);
            
            // Create the test user
            user = await users.create({
                user_id: "testUserId",
                email: "testuser@example.com",
                password: "testPassword123",
                bio: {
                    first_name: "Test",
                    last_name: "User",
                    location: {
                        country_region: "Test Country",
                        city: "Test City"
                    }
                },
                privacy_settings: {
                    flag_account_status: accountStatusEnum.public,
                    flag_who_can_send_you_invitations: invitationsEnum.everyone,
                    flag_messaging_requests: true,
                    messaging_read_receipts: true
                },
                activity: {
                    posts: [],
                    reposted_posts: [],
                    reacted_posts: [],
                    comments: [],
                    media: []
                },
                status: statusEnum.finding_new_job,
                blocked: [],
                conversations: [],
                is_verified: true,
                is_student: false,
                is_16_or_above: true
            });
            
            console.log("Test user created successfully");
        }

        // Create 20 sample conversations
        // for (let i = 20; i < 23; i++) {
        //     // Find or create other users
        //     let otherUser = await users.findOne({ user_id: `User-${i}` });
            
        //     if (!otherUser) {
        //         console.log(`Creating other user User-${i}...`);
        //         const salt = await bcrypt.genSalt(10);
        //         const hashedPassword = await bcrypt.hash("password123", salt);
                
        //         otherUser = await users.create({
        //             user_id: `User-${i}`,
        //             email: `user${i}@example.com`,
        //             password: "password123",
        //             bio: {
        //                 first_name: `User`,
        //                 last_name: `${i}`,
        //                 location: {
        //                     country_region: "Country",
        //                     city: "City"
        //                 }
        //             },
        //             privacy_settings: {
        //                 flag_account_status: accountStatusEnum.public,
        //                 flag_who_can_send_you_invitations: invitationsEnum.everyone,
        //                 flag_messaging_requests: true,
        //                 messaging_read_receipts: true
        //             },
        //             is_verified: true,
        //             is_student: false,
        //             is_16_or_above: true
        //         });
        //         console.log(`User-${i} created successfully`);
        //     }

        //     // Now create the conversation
        //     const conversation = await conversations.create({
        //         user1_id: user.user_id, // Use the ObjectId instead of user_id string
        //         user2_id: otherUser.user_id, // Use the ObjectId instead of user_id string
        //         last_message_time: new Date(),
        //         last_message_text: `Sample message ${i}`,
        //         unread_count_user1: 0,
        //         unread_count_user2: 0,
        //         is_blocked_by_user1: false,
        //         is_blocked_by_user2: false,
        //     });

        //     // Add sample messages to the conversation
        //     for (let j = 0; j < 5; j++) {
        //         // Determine if user1 or user2 is sending this message
        //         const isUser1Sending = j % 2 === 0;
        //         const senderId = isUser1Sending ? user.user_id : otherUser.user_id;
                
        //         await conversations.updateOne(
        //             { _id: conversation._id },
        //             {
        //                 $push: {
        //                     [`user${isUser1Sending ? 1 : 2}_sent_messages`]: {
        //                         // Added required fields from MessageInterface
        //                         sender_id: senderId,
        //                         messageId: new mongoose.Types.ObjectId().toString(), // Generate a unique ID
        //                         message: `Sample message ${j} from ${senderId}`,
        //                         media: [],
        //                         media_type: [], // Optional array for media types
        //                         timestamp: new Date(),
        //                         reacted: "", // Changed from boolean to string
        //                         is_seen: false
        //                         // typing is optional and not needed for sample data
        //                     },
        //                 },
        //             }
        //         );
        //     }
        // }

        console.log("Conversations populated successfully");
    } catch (error) {
        console.error("Error populating conversations:", error);
    } finally {
        await disconnectFromDatabase();
    }
}

populateConversations();