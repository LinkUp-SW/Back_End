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
    res.status(200).json({ profileVisibility: viewerUser.privacy_settings.flag_account_status  || accountStatusEnum.public });
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
      profileVisibility: viewerUser.privacy_settings.flag_account_status ,
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
      invitationSetting: viewerUser.privacy_settings.flag_who_can_send_you_invitations || invitationsEnum.everyone
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
      followSetting: viewerUser.privacy_settings.Who_can_follow_you  || followEnum.everyone,
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

// GET Messaging Read Receipts Setting
export const getReadReceiptsSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the authenticated user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    // Return the read receipts setting
    res.status(200).json({ 
      readReceipts: viewerUser.privacy_settings.messaging_read_receipts ?? true ,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error retrieving read receipts setting:", error);
      res.status(500).json({ message: "Error retrieving read receipts setting", error });
    }
  }
};

// UPDATE Messaging Read Receipts Setting
export const updateReadReceiptsSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the authenticated user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    // Ensure the user has privacy settings
    if (!viewerUser.privacy_settings) {
      res.status(404).json({ message: "User does not have privacy settings" });
      return;
    }

    // Extract the updated read receipts setting from the request body
    const { readReceipts } = req.body;

    // Validate that the provided setting is a boolean
    if (typeof readReceipts !== 'boolean') {
      res.status(400).json({ 
        message: "Invalid read receipts setting", 
        allowedValues: [true, false],
        example: {
          readReceipts: true // or false
        }
      });
      return;
    }

    // Update the user's read receipts setting
    viewerUser.privacy_settings.messaging_read_receipts = readReceipts;
    await viewerUser.save();

    res.status(200).json({
      message: "Read receipts setting updated successfully",
      readReceipts: viewerUser.privacy_settings.messaging_read_receipts,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error updating read receipts setting:", error);
      res.status(500).json({ message: "Error updating read receipts setting", error });
    }
  }
};

// GET Follow Primary Setting
export const getFollowPrimarySetting = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the authenticated user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    // Return the follow primary setting
    res.status(200).json({ 
      isFollowPrimary: viewerUser.privacy_settings.make_follow_primary ?? false
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error retrieving follow primary setting:", error);
      res.status(500).json({ message: "Error retrieving follow primary setting", error });
    }
  }
};

// UPDATE Follow Primary Setting
export const updateFollowPrimarySetting = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the authenticated user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    // Ensure the user has privacy settings
    if (!viewerUser.privacy_settings) {
      res.status(404).json({ message: "User does not have privacy settings" });
      return;
    }

    // Extract the updated follow primary setting from the request body
    const { isFollowPrimary } = req.body;

    // Validate that the provided setting is a boolean
    if (typeof isFollowPrimary !== 'boolean') {
      res.status(400).json({ 
        message: "Invalid follow primary setting", 
        allowedValues: [true, false],
        example: {
          isFollowPrimary: true // or false
        }
      });
      return;
    }

    // Update the user's follow primary setting
    viewerUser.privacy_settings.make_follow_primary = isFollowPrimary;
    await viewerUser.save();

    res.status(200).json({
      message: "Follow primary setting updated successfully",
      isFollowPrimary: viewerUser.privacy_settings.make_follow_primary,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error updating follow primary setting:", error);
      res.status(500).json({ message: "Error updating follow primary setting", error });
    }
  }
};

// GET Messaging Requests Setting
export const getMessagingRequestsSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the authenticated user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    // Return the messaging requests setting
    res.status(200).json({ 
      messagingRequests: viewerUser.privacy_settings.flag_messaging_requests ?? true,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error retrieving messaging requests setting:", error);
      res.status(500).json({ message: "Error retrieving messaging requests setting", error });
    }
  }
};

// UPDATE Messaging Requests Setting
export const updateMessagingRequestsSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the authenticated user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    // Ensure the user has privacy settings
    if (!viewerUser.privacy_settings) {
      res.status(404).json({ message: "User does not have privacy settings" });
      return;
    }

    // Extract the updated messaging requests setting from the request body
    const { messagingRequests } = req.body;

    // Validate that the provided setting is a boolean
    if (typeof messagingRequests !== 'boolean') {
      res.status(400).json({ 
        message: "Invalid messaging requests setting", 
        allowedValues: [true, false],
        example: {
          messagingRequests: true // or false
        }
      });
      return;
    }

    // Update the user's messaging requests setting
    viewerUser.privacy_settings.flag_messaging_requests = messagingRequests;
    await viewerUser.save();

    res.status(200).json({
      message: "Messaging requests setting updated successfully",
      messagingRequests: viewerUser.privacy_settings.flag_messaging_requests,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error updating messaging requests setting:", error);
      res.status(500).json({ message: "Error updating messaging requests setting", error });
    }
  }
};

// getter for all privacy settings
export const getAllPrivacySettings = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate token and get the authenticated user
    const viewerUser = await validateTokenAndGetUser(req, res);
    if (!viewerUser) return;

    // Return all privacy settings
    res.status(200).json({ 
      messagingRequests: viewerUser.privacy_settings.flag_messaging_requests ?? true,
      isFollowPrimary: viewerUser.privacy_settings.make_follow_primary ?? false,
      readReceipts: viewerUser.privacy_settings.messaging_read_receipts ?? true,
      followSetting: viewerUser.privacy_settings.Who_can_follow_you  || followEnum.everyone,
      invitationSetting: viewerUser.privacy_settings.flag_who_can_send_you_invitations || invitationsEnum.everyone,
      profileVisibility: viewerUser.privacy_settings.flag_account_status || accountStatusEnum.public,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message, success: false });
    } else {
      console.error("Error retrieving all privacy settings:", error);
      res.status(500).json({ message: "Error retrieving all privacy settings", error });
    }
  }
};