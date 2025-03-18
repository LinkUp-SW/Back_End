import { Request, Response } from "express";
import { validateUserId, findUserByUserId,  checkProfileAccess, validateUserIdFromRequest } from "../utils/database.helper.ts";
import privacy_settings, { accountStatusEnum } from "../models_to_delete/privacy_settings.model.ts";
import tokenValidation from "../utils/token.utils.ts";


// GET Profile Visibility
export const getProfileVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token to ensure the request is authenticated.

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    const userIdFromToken = tokenValidation.validateToken(token) as { userId: string };


    //const userIdFromToken = tokenValidation.validateToken(req.headers.authorization || "");
    console.log(userIdFromToken.userId);
    if (!userIdFromToken || !userIdFromToken.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = await validateUserIdFromRequest(req, res);
    if (!userId) return;

    console.log(userId);


    // Retrieve the target user using the unique ID.
    const targetUser = await findUserByUserId(userId, res);
    if (!targetUser) {
      return;
    }


    // Return the profile visibility setting.
    res.status(200).json({ profileVisibility: targetUser.privacy_settings.flag_account_status });
  } catch (error) {
    console.error("Error retrieving privacy settings:", error);
    res.status(500).json({ message: "Error retrieving privacy settings", error });
  }
};


/// UPDATE Profile Visibility
export const updateProfileVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and extract current user ID.
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    const userIdFromToken = tokenValidation.validateToken(token) as { userId: string };
    
    if (!userIdFromToken.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Extract the user_id from the URL parameters.
    const userIdFromUrl = await validateUserIdFromRequest(req, res);
    if (!userIdFromUrl) return;

    // Ensure that the user_id from the token matches the user_id in the URL.
    if (userIdFromToken.userId !== userIdFromUrl) {
      res.status(403).json({ message: "User is not authorized to update this profile" });
      return;
    }

    // Validate the user ID format.
    const validUserId = validateUserId(userIdFromToken.userId, res);
    if (!validUserId) return;

    // Retrieve the user document using the validated user_id.
    const user = await findUserByUserId(validUserId, res);
    if (!user) {
      return;
    }

    // Ensure the user has privacy settings.
    if (!user.privacy_settings) {
      res.status(404).json({ message: "User does not have privacy settings" });
      return;
    }

    // Extract the updated profile visibility from the request body.
    const { profileVisibility } = req.body;

    // Validate that the provided profile visibility is one of the allowed values.
    const allowedValues = Object.values(accountStatusEnum);
    if (!profileVisibility || !allowedValues.includes(profileVisibility)) {
      res.status(400).json({ message: "Invalid profile visibility setting" });
      return;
    }

    // Update the user's profile visibility.
    user.privacy_settings.flag_account_status = profileVisibility;
    await user.save();

    res.status(200).json({
      message: "Profile visibility updated successfully",
      profileVisibility: user.privacy_settings.flag_account_status,
    });
  } catch (error) {
    console.error("Error updating profile visibility:", error);
    res.status(500).json({ message: "Error updating profile visibility", error });
  }
};