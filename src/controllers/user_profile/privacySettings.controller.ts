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


// GET Who Can Send Invitations Setting
export const getInvitationSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the authenticated user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    // Return the invitation settings
    res.status(200).json({ 
      invitationSetting: viewerUser.privacy_settings.flag_who_can_send_you_invitations 
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error retrieving invitation settings:", error);
      res.status(500).json({ message: "Error retrieving invitation settings", error });
    }
  }
};

// UPDATE Who Can Send Invitations Setting
export const updateInvitationSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the authenticated user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    // Ensure the user has privacy settings
    if (!viewerUser.privacy_settings) {
      res.status(404).json({ message: "User does not have privacy settings" });
      return;
    }

    // Extract the updated invitation setting from the request body
    const { invitationSetting } = req.body;

    // Validate that the provided setting is one of the allowed values
    const allowedValues = Object.values(invitationsEnum);
    if (!invitationSetting || !allowedValues.includes(invitationSetting)) {
      res.status(400).json({ 
        message: "Invalid invitation setting", 
        allowedValues: allowedValues,
        example: {
          invitationSetting: "Everyone" // or "email"
        }
      });
      return;
    }

    // Update the user's invitation settings
    viewerUser.privacy_settings.flag_who_can_send_you_invitations = invitationSetting;
    await viewerUser.save();

    res.status(200).json({
      message: "Invitation settings updated successfully",
      invitationSetting: viewerUser.privacy_settings.flag_who_can_send_you_invitations,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error updating invitation settings:", error);
      res.status(500).json({ message: "Error updating invitation settings", error });
    }
  }
};


// GET Who Can Follow You Setting
export const getFollowSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the authenticated user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    // Return the follow settings
    res.status(200).json({ 
      followSetting: viewerUser.privacy_settings.Who_can_follow_you 
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error retrieving follow settings:", error);
      res.status(500).json({ message: "Error retrieving follow settings", error });
    }
  }
};

// UPDATE Who Can Follow You Setting
export const updateFollowSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the authenticated user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    // Ensure the user has privacy settings
    if (!viewerUser.privacy_settings) {
      res.status(404).json({ message: "User does not have privacy settings" });
      return;
    }

    // Extract the updated follow setting from the request body
    const { followSetting } = req.body;

    // Validate that the provided setting is one of the allowed values
    const allowedValues = Object.values(followEnum);
    if (!followSetting || !allowedValues.includes(followSetting)) {
      res.status(400).json({ 
        message: "Invalid follow setting", 
        allowedValues: allowedValues,
        example: {
          followSetting: "Everyone" // or "Connections only"
        }
      });
      return;
    }

    // Update the user's follow settings
    viewerUser.privacy_settings.Who_can_follow_you = followSetting;
    await viewerUser.save();

    res.status(200).json({
      message: "Follow settings updated successfully",
      followSetting: viewerUser.privacy_settings.Who_can_follow_you,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error updating follow settings:", error);
      res.status(500).json({ message: "Error updating follow settings", error });
    }
  }
};