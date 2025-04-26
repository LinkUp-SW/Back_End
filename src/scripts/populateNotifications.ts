import mongoose from "mongoose";
import users from "../models/users.model.ts";
import notifications from "../models/notifications.model.ts";
import { connectToTestDatabase, disconnectFromDatabase } from "../../config/database.ts";
import { accountStatusEnum, invitationsEnum, statusEnum } from "../models/users.model.ts";
import { NotificationType } from "../models/notifications.model.ts";
import bcrypt from "bcrypt";

// populate notifications for testing
const populateNotifications = async () => {
    try {
        // Connect to MongoDB
        await connectToTestDatabase()
        console.log("Connected to database");

        // Find the main test user by user_id
        let mainUser = await users.findOne({ user_id: "newtestUserId" });
        
        // Create the test user if it doesn't exist
        if (!mainUser) {
            console.log("Main test user not found, creating one...");
            
            
            // Create the test user
            mainUser = await users.create({
                user_id: "newtestUserId",
                email: "newtestUserId@example.com",
                password: "testPassword123",
                bio: {
                    first_name: "NewTest",
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
            
            console.log("Main test user created successfully");
        }

        // Create 20 other users to interact with mainUser
        const otherUsers = [];
        for (let i = 20; i < 26; i++) {
            // Find or create other users
            let otherUser = await users.findOne({ user_id: `NotifUser-${i}` });
            
            if (!otherUser) {
                console.log(`Creating other user NotifUser-${i}...`);
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash("password123", salt);
                
                otherUser = await users.create({
                    user_id: `NotifUser-${i}`,
                    email: `notifuser${i}@example.com`,
                    password: "password123",
                    bio: {
                        first_name: `User`,
                        last_name: `${i}`,
                        location: {
                            country_region: "Country",
                            city: "City"
                        }
                    },
                    privacy_settings: {
                        flag_account_status: accountStatusEnum.public,
                        flag_who_can_send_you_invitations: invitationsEnum.everyone,
                        flag_messaging_requests: true,
                        messaging_read_receipts: true
                    },
                    is_verified: true,
                    is_student: false,
                    is_16_or_above: true,
                    profile_photo: "https://res.cloudinary.com/dmg8tdy5r/image/upload/v1743174303/user_uploads/images/1743174231833-duck.jpg",
                });
                console.log(`NotifUser-${i} created successfully`);
            }
            
            otherUsers.push(otherUser);
        }

        // Delete existing notifications to avoid duplicates
        await notifications.deleteMany({});
        console.log("Cleared existing notifications");

        // Create various types of notifications
        const notificationTypes = Object.values(NotificationType);
        let notificationCount = 0;

        // Create notifications where mainUser is the recipient
        for (let i = 0; i < otherUsers.length; i++) {
            const sender = otherUsers[i];
            
            // Each user sends different notification types
            const notifTypesCount = i % notificationTypes.length;
            
            // Create different notification types based on user index
            for (let j = 0; j <= notifTypesCount; j++) {
                const type = notificationTypes[j];
                const isRead = notificationCount % 3 === 0; // Make every third notification read
                const referenceId = new mongoose.Types.ObjectId(); // Simulate a reference to a post/comment/etc
                
                let content = "";
                switch (type) {
                    case NotificationType.REACTED:
                        content = `${sender.bio.first_name} ${sender.bio.last_name} liked your post`;
                        break;
                    case NotificationType.COMMENT:
                        content = `${sender.bio.first_name} ${sender.bio.last_name} commented on your post: "Great content!"`;
                        break;
                    case NotificationType.CONNECTION_REQUEST:
                        content = `${sender.bio.first_name} ${sender.bio.last_name} sent you a connection request`;
                        break;
                    case NotificationType.CONNECTION_ACCEPTED:
                        content = `${sender.bio.first_name} ${sender.bio.last_name} accepted your connection request`;
                        break;
                    case NotificationType.MESSAGE:
                        content = `${sender.bio.first_name} ${sender.bio.last_name} sent you a message`;
                        break;
                    case NotificationType.FOLLOW:
                        content = `${sender.bio.first_name} ${sender.bio.last_name} started following you`;
                        break;
                    default:
                        content = `New notification from ${sender.bio.first_name} ${sender.bio.last_name}`;
                }

                // Create notification with mainUser as recipient
                await notifications.create({
                    recipient_id: mainUser.user_id,
                    sender_id: sender.user_id,
                    type,
                    reference_id: referenceId,
                    content,
                    is_read: isRead,
                    created_at: new Date(Date.now() - (notificationCount * 60000)) // Stagger creation times
                });
                
                notificationCount++;
                console.log(`Created ${type} notification from ${sender.user_id} to ${mainUser.user_id}`);
            }
        }
        
        // Create a few notifications where mainUser is the sender and others are recipients
        for (let i = 0; i < 10; i++) {
            const recipient = otherUsers[i];
            const type = notificationTypes[i % notificationTypes.length];
            const isRead = i % 2 === 0; // Make every other notification read
            const referenceId = new mongoose.Types.ObjectId();
            
            let content = "";
            switch (type) {
                case NotificationType.REACTED:
                    content = `${mainUser.bio.first_name} ${mainUser.bio.last_name} liked your post`;
                    break;
                case NotificationType.COMMENT:
                    content = `${mainUser.bio.first_name} ${mainUser.bio.last_name} commented on your post: "Nice work!"`;
                    break;
                case NotificationType.CONNECTION_REQUEST:
                    content = `${mainUser.bio.first_name} ${mainUser.bio.last_name} sent you a connection request`;
                    break;
                case NotificationType.CONNECTION_ACCEPTED:
                    content = `${mainUser.bio.first_name} ${mainUser.bio.last_name} accepted your connection request`;
                    break;
                case NotificationType.MESSAGE:
                    content = `${mainUser.bio.first_name} ${mainUser.bio.last_name} sent you a message`;
                    break;
                case NotificationType.FOLLOW:
                    content = `${mainUser.bio.first_name} ${mainUser.bio.last_name} started following you`;
                    break;
                default:
                    content = `New notification from ${mainUser.bio.first_name} ${mainUser.bio.last_name}`;
            }

            // Create notification with mainUser as sender
            await notifications.create({
                recipient_id: recipient.user_id,
                sender_id: mainUser.user_id,
                type,
                reference_id: referenceId,
                content,
                is_read: isRead,
                created_at: new Date(Date.now() - (i * 120000)) // Stagger creation times
            });
            
            notificationCount++;
            console.log(`Created ${type} notification from ${mainUser.user_id} to ${recipient.user_id}`);
        }

        console.log(`Total of ${notificationCount} notifications created successfully`);

    } catch (error) {
        console.error("Error populating notifications:", error);
    } finally {
        await disconnectFromDatabase();
    }
}

populateNotifications();