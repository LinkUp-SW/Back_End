import { Request, Response } from "express";
import mongoose from "mongoose";
import Users from "../models/users.model.ts";
import { usersInterface } from "../models/users.model.ts"; // Ensure this path is correct

/**
 * Validates that the provided user_id is a valid MongoDB ObjectId.
 * Returns the user_id if valid; otherwise sends an error response and returns null.
 */
export const validateUserId = (user_id: string, res: Response): string | null => {
    if (!user_id) {
        res.status(400).json({ message: "User ID is required" });
        return null;
    }
    return user_id;
};

/**
 * Validates the user_id passed in the request URL parameters.
 * Extracts the user_id from req.params and validates it.
 * Returns the user_id if valid; otherwise sends an error response and returns null.
 */
export const validateUserIdFromRequest = async (req: Request, res: Response): Promise<string | null> => {
    const {user_id} = req.params; // Assuming the user_id is passed in the URL as a parameter
    if (!user_id) {
        res.status(400).json({ message: "User ID is required in the URL" });
        return null;
    }
    const user = await Users.findOne({ user_id });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return null;
        }
    
    return user_id;
};




/**
 * Finds a user by the given user_id.
 * Returns the user document if found; otherwise sends a 404 response and returns null.
 */
export const findUserByUserId = async (user_id: string, res: Response) => {
    try {
        // Query the database using the `user_id` field
        const user = await Users.findOne({ user_id });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return null;
        }
        return user;
    } catch (error) {
        console.error("Error finding user by user_id:", error);
        res.status(500).json({ message: "Error finding user", error });
        return null;
    }
};


/**
 * Checks if the current user has access to view the target user's profile.
 * This function can be extended based on your application's business rules.
 */
export const checkProfileAccess = async (
    currentUserId: string,
    targetUserId: string
): Promise<boolean> => {
    try {
        const targetUser = await Users.findById(targetUserId);
        if (!targetUser) {
            return false;
        }

        // Allow access if the profile is public
        if (
            targetUser.privacy_settings &&
            targetUser.privacy_settings.flag_account_status === "Public"
        ) {
            return true;
        }

        // Allow access if the current user is connected to the target user
        if (
            targetUser.connections &&
            targetUser.connections.some((connection: usersInterface) => connection.id === currentUserId)
        ) {
            return true;
        }

        // Deny access if none of the conditions are met
        return false;
    } catch (error) {
        console.error("Error checking profile access:", error);
        return false;
    }
};