import { Request, Response } from "express";
import { validateUserId, findUserById } from "../utils/database.helper.ts";
import privacy_settings, { accountStatusEnum } from "../models/privacy_settings.model.ts";

export const getProfileVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate that the user_id parameter exists and is a valid ObjectId.
    const user_id = validateUserId(req, res);
    if (!user_id) return;

    // Retrieve the user document from the database.
    const user = await findUserById(user_id, res);
    if (!user) return;

    // Check if the user has privacy settings.
    if (!user.privacy_settings) {
      res.status(404).json({ message: "User does not have privacy settings" });
      return;
    }

    // Retrieve the privacy settings document.
    const privacySettings = await privacy_settings.findById(user.privacy_settings);
    if (!privacySettings) {
      res.status(404).json({ message: "Privacy settings not found" });
      return;
    }

    // Return the privacy settings.
    res.status(200).json({ profileVisibility: privacySettings.flag_account_status });
  } catch (error) {
    console.error("Error retrieving privacy settings:", error);
    res.status(500).json({ message: "Error retrieving privacy settings", error });
  }
};

// Update Profile Visibility
export const updateProfileVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate that the user_id parameter exists and is valid.
    const user_id = validateUserId(req, res);
    if (!user_id) return;

    // Retrieve the user document.
    const user = await findUserById(user_id, res);
    if (!user) return;

    // Check if the user has privacy settings.
    if (!user.privacy_settings) {
      res.status(404).json({ message: "User does not have privacy settings" });
      return;
    }

    // Retrieve the privacy settings document.
    const privacySettings = await privacy_settings.findById(user.privacy_settings);
    if (!privacySettings) {
      res.status(404).json({ message: "Privacy settings not found" });
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
    privacySettings.flag_account_status = profileVisibility;
    await privacySettings.save();

    res.status(200).json({
      message: "Profile visibility updated successfully",
      profileVisibility: privacySettings.flag_account_status,
    });
  } catch (error) {
    console.error("Error updating profile visibility:", error);
    res.status(500).json({ message: "Error updating profile visibility", error });
  }
};