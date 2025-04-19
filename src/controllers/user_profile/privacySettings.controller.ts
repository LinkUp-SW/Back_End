import { Request, Response } from "express";
import { accountStatusEnum , invitationsEnum, followEnum }  from "../../models/users.model.ts";
import { validateTokenAndGetUser } from "../../utils/helperFunctions.utils.ts";

// GET Profile Visibility
export const getProfileVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the authenticated user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    // Return the profile visibility setting
    res.status(200).json({ profileVisibility: viewerUser.privacy_settings.flag_account_status });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error retrieving privacy settings:", error);
      res.status(500).json({ message: "Error retrieving privacy settings", error });
    }
  }
};

// UPDATE Profile Visibility
export const updateProfileVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the authenticated user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;


    // Ensure the user has privacy settings
    if (!viewerUser.privacy_settings) {
      res.status(404).json({ message: "User does not have privacy settings" });
      return;
    }

    // Extract the updated profile visibility from the request body
    const { profileVisibility } = req.body;

    // Validate that the provided profile visibility is one of the allowed values
    const allowedValues = Object.values(accountStatusEnum);
    if (!profileVisibility || !allowedValues.includes(profileVisibility)) {
      res.status(400).json({ 
        message: "Invalid profile visibility setting", 
        allowedValues: allowedValues,
        example: {
          profileVisibility: "Public" // or "Private" or "Connections only"
        }
      });
      return;
    }

    // Update the user's profile visibility
    viewerUser.privacy_settings.flag_account_status = profileVisibility;
    await viewerUser.save();

    res.status(200).json({
      message: "Profile visibility updated successfully",
      profileVisibility: viewerUser.privacy_settings.flag_account_status,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error updating profile visibility:", error);
      res.status(500).json({ message: "Error updating profile visibility", error });
    }
  }
};


