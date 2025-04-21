// File to populate the database with users
import dotenv from "dotenv";
import users from "../models/users.model.ts";
import mongoose from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "../../config/database.ts";

dotenv.config();

// List of users to populate
const userData = [
    { name: "Hamza Ayman", password: "Password123", is_student: true },
    { name: "Yusuf Afify", password: "Password123", is_student: false },
    { name: "Youssef Awad", password: "Password123", is_student: true },
    { name: "Marwan Emam", password: "Password123", is_student: false },
    { name: "Mohamed Hazem", password: "Password123", is_student: true },
    { name: "Sama Mohammed", password: "Password123", is_student: false },
    { name: "Tarek Waleed", password: "Password123", is_student: true },
    { name: "Mahmoud Amr", password: "Password123", is_student: false },
    { name: "Omar Khaled", password: "Password123", is_student: true },
    { name: "Ghada Boghdady", password: "Password123", is_student: false },
    { name: "Nada Omar", password: "Password123", is_student: true },
    { name: "Malak Eltuny", password: "Password123", is_student: false },
    { name: "Mohaned Tarek", password: "Password123", is_student: true },
    { name: "Amr Safwat", password: "Password123", is_student: false },
    { name: "Abdullah Aref", password: "Password123", is_student: true },
    { name: "Jumana Amr", password: "Password123", is_student: false },
    { name: "Youssef Hassanein", password: "Password123", is_student: true },
    { name: "Youssed Raafat", password: "Password123", is_student: false },
];

const populateUsers = async () => {
    try {
        // Connect to the database
        await connectToDatabase();
        console.log("Connected to database");

        // Clear all collections in the database
        if (!mongoose.connection.db) {
            throw new Error('Database connection not established');
        }
        const collections = await mongoose.connection.db.collections();
        for (const collection of collections) {
            await collection.deleteMany({});
            console.log(`Cleared collection: ${collection.collectionName}`);
        }

        // Populate the database with the specified users
        for (const user of userData) {
            const newUser = await users.create({
                user_id: `${user.name.replace(" ", "-").toLowerCase()}-${Date.now()}`, // Generate unique user_id as a string
                name: user.name,
                email: `${user.name.replace(" ", ".").toLowerCase()}@example.com`,
                password: user.password,
                profile_picture: `https://example.com/avatars/${user.name.replace(" ", "-").toLowerCase()}.png`, // Realistic profile picture URL
                bio: {
                    first_name: user.name.split(" ")[0],
                    last_name: user.name.split(" ")[1],
                    headline: user.is_student 
                        ? "Student at Cairo University" 
                        : "Software Engineer",
                    experience: [],
                    education: [],
                    website: "www.example.com",
                    contact_info: {
                        phone_number: 1012345678,
                        country_code: "+20",
                        phone_type: "mobile",
                        address: "12 Street, Cairo, Egypt",
                        birthday: new Date("2000-01-01"),
                        website: "www.example.com",
                    },
                    location: {
                        country_region: "Egypt",
                        city: user.is_student ? "Cairo" : "New Cairo",
                    },
                },
                location: user.is_student ? "Cairo University, Egypt" : "Tech Park, Cairo, Egypt",
                date_of_birth: new Date("2000-01-01"), // Default date of birth
                is_student: user.is_student,
                is_verified: false,
                is_16_or_above: true,
                is_admin: false,
                resume: '',
                activity: {
                    posts: [],
                    comments: [],
                    reacted_posts: [],
                    saved_posts: [],
                    followers: [],
                    following: [],
                },
            });
            console.log(`User created: ${newUser.name}`);
        }

        // Add the admin user
        const adminUser = await users.create({
            user_id: `linkupadmin-${Date.now()}`, // Generate unique user_id as a string
            name: "LinkupAdmin",
            email: "admin@linkup.com",
            password: "AdminPassword123",
            profile_picture: "https://example.com/avatars/admin-avatar.png", // Admin profile picture
            bio: "I am the admin of Linkup. Feel free to reach out for any assistance.",
            location: "Admin Headquarters, Cairo, Egypt", // Admin location
            date_of_birth: new Date("1990-01-01"), // Admin date of birth
            is_student: false,
            is_verified: true,
            is_16_or_above: true,
            is_admin: true,
            activity: {
                posts: [],
                comments: [],
                reacted_posts: [],
                saved_posts: [],
                followers: [],
                following: [],
            },
        });
        console.log(`Admin user created: ${adminUser.name}`);

        console.log("All users created successfully");
    } catch (error) {
        console.error("Error populating users:", error);
    } finally {
        // Disconnect from the database
        await disconnectFromDatabase();
    }
};

populateUsers().catch((error) => {
    console.error("Error in populateUsers:", error);
});