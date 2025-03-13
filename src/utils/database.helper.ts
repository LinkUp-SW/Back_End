import { Request, Response } from "express";
import mongoose from "mongoose";
import Users from "../models/users.model.ts"; 

/**
 * Validates that the user_id is present and is a valid MongoDB ObjectId.
 * Returns the user_id if valid; otherwise sends an error response and returns null.
 */
export const validateUserId = (req: Request, res: Response): string | null => {
    const { user_id } = req.params;
    if (!user_id) {
        res.status(400).json({ message: "User ID is required" });
        return null;
    }
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        res.status(400).json({ message: "Invalid user ID format" });
        return null;
    }
    return user_id;
};

/**
 * Finds a client by the given user_id.
 * Returns the client document if found; otherwise sends a 404 response and returns null.
 */
export const findUserById = async (user_id: string, res: Response) => {
    try {
        const user = await Users.findById(user_id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return null;
        }
        return user;
    } catch (error) {
        res.status(500).json({ message: "Error finding user", error });
        return null;
    }
};

