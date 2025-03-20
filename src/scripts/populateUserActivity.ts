import mongoose from "mongoose";
import dotenv from "dotenv";
import users from "../models/users.model.ts";
import posts from "../models/posts.model.ts";
import comments from "../models/comments.model.ts";
import { postsInterface } from "../models/posts.model.ts";
import { commentsInterface } from "../models/comments.model.ts";

dotenv.config();
const DATABASE_URL = process.env.DATABASE_URL || "";

const populateUserActivity = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(DATABASE_URL, {
        });
        console.log("Connected to database");

        // Find the user by user_id
        const user = await users.findOne({ user_id: "Mahmoud-Amr-123" });
        if (!user) {
            console.error("User not found");
            return;
        }

        // Create 20 sample posts
        const postsArray = [];
        for (let i = 3; i <= 22; i++) {
            const post = await posts.create({
                user_id: user.user_id,
                content: `Sample post ${i}`,
                comments_disabled: "Anyone",
                visibility: true,
                media: [`http://example.com/post${i}`],
                tagged_users: [],
                comments: [],
            }) as postsInterface;
            postsArray.push(post);
            user.activity.posts.push(post._id as postsInterface);
        }

        // Create 20 sample comments
        const commentsArray = [];
        for (let i = 3; i <= 22; i++) {
            const comment = await comments.create({
                post_id: postsArray[i % postsArray.length]._id, // Assign comments to posts in a round-robin manner
                user_id: user.user_id,
                content: `Sample comment ${i}`,
                media: [],
                reacts: [],
                tagged_users: [],
            }) as commentsInterface;
            commentsArray.push(comment);
            user.activity.comments.push(comment._id as commentsInterface);
        }

        // Add 20 posts to reacted_posts (simulating reactions)
        for (let i = 0; i < 20; i++) {
            const reactedPost = postsArray[i % postsArray.length]._id; // React to posts in a round-robin manner
            user.activity.reacted_posts.push(reactedPost as postsInterface);
        }

        // Save the updated user document
        await user.save();

        console.log("User activity populated successfully with 20 posts, 20 comments, and 20 reacted posts.");
    } catch (error) {
        console.error("Error populating user activity:", error);
    } finally {
        // Disconnect from MongoDB
        await mongoose.connection.close();
    }
};

populateUserActivity();