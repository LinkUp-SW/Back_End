import mongoose from "mongoose";
import users from "../models/users.model.ts";
import conversations from "../models/conversations.model.ts";
import { connectToTestDatabase, disconnectFromDatabase } from "../../config/database.ts";
import { accountStatusEnum, invitationsEnum, statusEnum } from "../models/users.model.ts";
import bcrypt from "bcrypt";

// Define conversation templates for different contexts
const conversationTemplates = [
  // Job Inquiry Conversation
  [
    "Hi there! I noticed you're working at {company}. I'm interested in the {position} role there. Would you have time for a quick chat about your experience?",
    "Hello! Nice to meet you. I'd be happy to chat about my experience at {company}. What would you like to know specifically?",
    "Thanks for getting back to me! I'm curious about the company culture and work-life balance. Also, do you enjoy the projects you're working on?",
    "The culture is collaborative and supportive. Work-life balance is actually pretty good - we have flexible hours and remote options. I'm currently working on an exciting project involving cloud migration that I've found really engaging.",
    "That sounds great! Would you mind if I sent you my resume? Any tips for the application process would be really appreciated.",
    "Sure, feel free to send it over. As for tips, definitely emphasize any experience with {skill} as that's something our team values. Also, be prepared to talk about how you handle challenges during the interview.",
    "Will do! Thanks so much for your help. I'll update my resume to highlight my {skill} experience.",
    "No problem at all. Good luck with your application! Feel free to reach out if you have any other questions."
  ],
  
  // Professional Networking Conversation
  [
    "Hi {name}, I saw your presentation at the recent {topic} conference and found it really insightful. I work in a similar field and would love to connect.",
    "Thank you for reaching out! I'm glad you enjoyed the presentation. Always happy to connect with others in the industry. What aspects of {topic} are you currently working on?",
    "I'm currently focused on implementing {technology} solutions for small businesses. Your approach to scaling these solutions was particularly interesting to me.",
    "That's a fascinating area! I've found that {technology} adoption in small businesses presents unique challenges compared to enterprise implementation. Would you be interested in collaborating on a case study?",
    "Absolutely! A case study would be great. I have some data from recent projects that could provide valuable insights.",
    "Perfect. Let's schedule a call next week to discuss the details. Would Tuesday or Wednesday work for you?",
    "Wednesday would be perfect. How about 2pm?",
    "Wednesday at 2pm works for me. I'll send a calendar invite with meeting details. Looking forward to it!"
  ],
  
  // Project Collaboration Conversation
  [
    "Hey, I saw your portfolio and I'm impressed with your UI design skills. I'm working on a project that could use your expertise. Would you be interested in collaborating?",
    "Hi there! Thanks for the kind words about my portfolio. I'd definitely be interested in hearing more about your project. What are you working on?",
    "I'm developing a mobile app for fitness tracking with some unique features. We have the backend mostly sorted but need help with creating an intuitive and engaging interface.",
    "That sounds interesting! I've worked on fitness applications before. What's your timeline for this project, and do you have any specific design direction in mind?",
    "We're looking to launch in about 3 months. As for design, we want something clean and motivational - something that encourages daily use without feeling overwhelming.",
    "I think I can help with that approach. I could prepare some initial mockups for a few key screens to see if my style matches what you're looking for. Would that work?",
    "That would be perfect! I can send over our functional requirements and brand guidelines today.",
    "Great! Once I receive those, I'll need about a week to prepare the initial concepts. Looking forward to working together on this!"
  ],
  
  // Technical Question Conversation
  [
    "Hi, I noticed you have experience with React Native. I'm struggling with optimizing performance for a list with many items. Any suggestions?",
    "Hey there! Happy to help. For long lists, have you tried using FlatList with the windowSize and maxToRenderPerBatch props optimized?",
    "Yes, I'm using FlatList but haven't adjusted those specific props. What values would you recommend for a list that might have hundreds of items?",
    "For hundreds of items, I'd suggest starting with windowSize around 10-15 and maxToRenderPerBatch around 10. Also, make sure you're implementing getItemLayout and a proper keyExtractor function.",
    "That's really helpful! Should I also be concerned about the complexity of my renderItem component?",
    "Absolutely. Keep your renderItem as simple as possible. If you need complex items, consider using React.memo() to prevent unnecessary re-renders and move any heavy calculations outside the render function.",
    "Makes sense. I'll implement these changes and see how it performs. Thanks so much for your guidance!",
    "No problem! Let me know how it goes. If you're still having issues, we could look at your specific implementation in more detail."
  ],
  
  // Casual Catch-up Conversation
  [
    "Hey! How have you been? It's been a while since we caught up.",
    "Hi there! I've been good, thanks for asking. Been pretty busy with work lately. How about you?",
    "Same here - work has been hectic. Did you end up going on that vacation you were planning?",
    "Yes! I finally went to Japan last month. It was amazing - the food, the culture, everything was just fantastic. Have you done any traveling recently?",
    "That sounds incredible! I've always wanted to visit Japan. I did a quick weekend trip to the mountains last month - nothing as exciting as Japan, but it was a nice break.",
    "Sometimes those short trips are just what you need. We should grab coffee sometime soon and I can show you some photos from the trip!",
    "Definitely! How about next Friday afternoon?",
    "Friday works for me! Let's say 3pm at that new coffee place downtown?"
  ],
  
  // Event Planning Conversation
  [
    "Hi team! I'm organizing a tech meetup next month and looking for speakers. Would anyone be interested in presenting?",
    "I'd be interested! I could share insights from our recent migration to microservices architecture.",
    "That would be perfect! We're looking for practical case studies. How long would you need for your presentation?",
    "I think 20-25 minutes would be ideal, plus some time for Q&A. Would that work with your schedule?",
    "That timeframe works great. The event is planned for the 15th from 6-8pm. Does that date work for you?",
    "The 15th works for me. Should I prepare slides, and is there a particular aspect of the migration you'd like me to focus on?",
    "Yes, slides would be great. Focus on challenges you faced and how you overcame them - that's always valuable for the audience.",
    "Perfect! I'll start preparing and send you a draft of my slides next week for feedback."
  ],
  
  // Mentorship Conversation
  [
    "Hi, I'm new to the software development field and saw that you have extensive experience. Would you be open to providing some mentorship?",
    "Hello! I'm always happy to help newcomers to the field. What areas are you specifically looking for guidance in?",
    "Thank you! I'm currently trying to decide which area to specialize in - frontend, backend, or perhaps devops. Any advice on how to make that decision?",
    "That's a common question! My advice is to try small projects in each area and see what energizes you the most. Additionally, consider your natural strengths - are you more visually creative (frontend), logic-oriented (backend), or system-focused (devops)?",
    "That's really helpful. I've enjoyed frontend projects so far, but I'm concerned about the constantly changing technology landscape. Does that make it harder to stay relevant?",
    "All areas of tech require continuous learning, but frontend does change quickly. That said, core principles remain constant. If you enjoy it, the learning becomes interesting rather than burdensome. Would you like me to recommend some resources to explore?",
    "Yes, that would be amazing! Any resources you've found particularly helpful would be great.",
    "I'll put together a list of books, courses, and projects that helped me. Also, would you be interested in having regular check-ins to discuss your progress?"
  ],
  
  // Industry News Discussion
  [
    "Have you seen the news about the latest AI advancement in code generation? Seems like it could change how we work.",
    "Yes, I've been following it closely! The capabilities are impressive, though I have mixed feelings about its implications for junior developers.",
    "That's a good point. Do you think it will make programming more accessible or potentially reduce opportunities for new developers?",
    "I think it will transform the role rather than eliminate it. Junior devs might spend less time on boilerplate code and more on understanding systems and making architectural decisions.",
    "Interesting perspective. Have you tried incorporating any of these tools into your workflow yet?",
    "I've been experimenting with GitHub Copilot. It's surprisingly helpful for routine tasks and documentation, but I still find myself carefully reviewing and often modifying its suggestions.",
    "That matches what I've heard. I'm planning to try it out this weekend. Any tips for getting the most value while avoiding overreliance?",
    "Start with using it for repetitive patterns and documentation. Be critical of complex logic it generates, and use it as a learning tool by understanding why it suggests certain approaches."
  ]
];

// Utility functions for creating realistic conversations
const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

const createRandomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const getRandomMessage = (index: number, user1Name: string, user2Name: string): string => {
  // Select a random conversation template
  const template = getRandomElement(conversationTemplates);
  // Get the appropriate message for this index (loop if needed)
  const messageTemplate = template[index % template.length];
  
  // Replace placeholders with realistic values
  return messageTemplate
    .replace(/{name}/g, index % 2 === 0 ? user2Name : user1Name)
    .replace(/{company}/g, getRandomElement(['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Startup Hub']))
    .replace(/{position}/g, getRandomElement(['Software Engineer', 'UX Designer', 'Product Manager', 'Data Scientist', 'DevOps Engineer']))
    .replace(/{skill}/g, getRandomElement(['React', 'Node.js', 'Python', 'AWS', 'TensorFlow', 'UI/UX', 'Agile methodology']))
    .replace(/{topic}/g, getRandomElement(['AI Ethics', 'DevOps', 'Microservices', 'Responsive Design', 'Data Privacy', 'Cloud Migration']))
    .replace(/{technology}/g, getRandomElement(['blockchain', 'serverless', 'edge computing', 'containerization', 'machine learning']));
};

const generateMessageTimeSequence = (count: number): Date[] => {
  const now = new Date();
  const dates: Date[] = [];
  const baseTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Start from a week ago
  
  for (let i = 0; i < count; i++) {
    // Realistic time gaps between messages (shorter for ongoing conversations)
    const previousTime = i === 0 ? baseTime : dates[i-1];
    const minGap = i % 2 === 0 ? 1 * 60 * 1000 : 2 * 60 * 1000; // 1-2 minutes minimum
    const maxGap = i % 2 === 0 ? 60 * 60 * 1000 : 3 * 60 * 60 * 1000; // 1-3 hours maximum
    const nextTime = new Date(previousTime.getTime() + getRandomInt(minGap, maxGap));
    dates.push(nextTime);
  }
  
  return dates;
};

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
            
            // Create the test user
            user = await users.create({
                user_id: "testUserId",
                email: "testuser@example.com",
                password: "testPassword123",
                bio: {
                    first_name: "Alex",
                    last_name: "Morgan",
                    location: {
                        country_region: "United States",
                        city: "San Francisco"
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
                is_16_or_above: true,
                profile_photo: "https://res.cloudinary.com/dmg8tdy5r/image/upload/v1743174303/user_uploads/images/1743174231833-profile1.jpg",
            });
            
            console.log("Test user created successfully");
        }

        // List of realistic first names for more natural conversations
        const firstNames = ["Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "Logan", 
                           "Mia", "Jacob", "Charlotte", "Jackson", "Amelia", "Daniel", "Harper", "David", "Evelyn", "Joseph"];
                           
        // Create 20 sample conversations with more realistic content
        for (let i = 30; i < 41; i++) {
            // Find or create other users with more realistic names
            const firstName = firstNames[i % firstNames.length];
            let otherUser = await users.findOne({ user_id: `User-${i}` });
            
            if (!otherUser) {
                console.log(`Creating other user ${firstName}...`);
                
                otherUser = await users.create({
                    user_id: `User-${i}`,
                    email: `${firstName.toLowerCase()}${i}@example.com`,
                    password: "password123",
                    bio: {
                        first_name: firstName,
                        last_name: `Johnson`,
                        location: {
                            country_region: getRandomElement(["United States", "Canada", "United Kingdom", "Australia", "Germany"]),
                            city: getRandomElement(["New York", "Toronto", "London", "Sydney", "Berlin", "San Francisco", "Chicago"])
                        }
                    },
                    privacy_settings: {
                        flag_account_status: accountStatusEnum.public,
                        flag_who_can_send_you_invitations: invitationsEnum.everyone,
                        flag_messaging_requests: true,
                        messaging_read_receipts: true
                    },
                    is_verified: true,
                    is_student: i % 4 === 0, // Some users are students
                    is_16_or_above: true,
                    profile_photo: `https://res.cloudinary.com/dmg8tdy5r/image/upload/v1743174303/user_uploads/images/1743174231833-profile${(i % 5) + 2}.jpg`,
                });
                console.log(`${firstName} created successfully`);
            }

            // Generate timestamps for a realistic message sequence
            const messageCount = getRandomInt(5, 12); // Random number of messages between 5 and 12
            const messageTimes = generateMessageTimeSequence(messageCount);
            const lastMessageTime = messageTimes[messageTimes.length - 1];
            
            // Get the last message for the conversation preview
            const lastMessageIndex = messageCount - 1;
            const isLastMessageFromUser1 = lastMessageIndex % 2 === 0;
            const lastMessageText = getRandomMessage(lastMessageIndex, user.bio.first_name, otherUser.bio.first_name);

            // Now create the conversation with realistic last message and time
            const conversation = await conversations.create({
                user1_id: user.user_id,
                user2_id: otherUser.user_id,
                last_message_time: lastMessageTime,
                last_message_text: lastMessageText,
                unread_count_user1: isLastMessageFromUser1 ? 0 : getRandomInt(0, 1), // Sometimes unread messages
                unread_count_user2: isLastMessageFromUser1 ? getRandomInt(0, 1) : 0,
                is_blocked_by_user1: false,
                is_blocked_by_user2: false,
            });

            // Add all messages to the conversation
            for (let j = 0; j < messageCount; j++) {
                // Determine if user1 or user2 is sending this message
                const isUser1Sending = j % 2 === 0;
                const senderId = isUser1Sending ? user.user_id : otherUser.user_id;
                
                // Get a realistic message based on conversation flow
                const message = getRandomMessage(j, user.bio.first_name, otherUser.bio.first_name);
                
                // Some messages have reactions
                const hasReaction = Math.random() > 0.7; // 30% chance of having a reaction
                const reaction = hasReaction ? getRandomElement(['❤️', '👍', '😊', '🎉', '🙏', '💯']) : "";
                
                // Most messages have been seen, except very recent ones
                const isSeen = j < messageCount - (isUser1Sending ? 1 : 0);
                
                await conversations.updateOne(
                    { _id: conversation._id },
                    {
                        $push: {
                            [`user${isUser1Sending ? 1 : 2}_sent_messages`]: {
                                sender_id: senderId,
                                messageId: new mongoose.Types.ObjectId().toString(),
                                message: message,
                                media: [], // No media for simplicity, but could be added
                                media_type: [],
                                timestamp: messageTimes[j],
                                reacted: reaction,
                                is_seen: isSeen
                            },
                        },
                    }
                );
            }

            // Add the conversation ID to both users' conversation lists
            await users.updateOne(
                { user_id: user.user_id },
                { $addToSet: { conversations: conversation._id } }
            );
            
            await users.updateOne(
                { user_id: otherUser.user_id },
                { $addToSet: { conversations: conversation._id } }
            );
            
            console.log(`Created conversation between ${user.bio.first_name} and ${otherUser.bio.first_name} with ${messageCount} messages`);
        }

        console.log("Conversations populated successfully with realistic content");
    } catch (error) {
        console.error("Error populating conversations:", error);
    } finally {
        await disconnectFromDatabase();
    }
}

populateConversations();