import { Request, Response } from "express";
import cloudinary from "../../../config/cloudinary.ts";
import { extractPublicId } from "../../services/cloudinary.service.ts";
import { getUserIdFromToken, validateTokenAndUser, } from "../../utils/helperFunctions.utils.ts";
import { usersInterface } from "../../models/users.model.ts";
import {findUserByUserId} from "../../utils/database.helper.ts";
import { profile } from "console";
const DEFAULT_IMAGE_URL = "https://res.cloudinary.com/dyhnxqs6f/image/upload/v1719229880/meme_k18ky2_c_crop_w_674_h_734_x_0_y_0_u0o1yz.png";
 


// Upload Profile Picture
const uploadProfilePicture = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded or invalid file type. Only image files are allowed." });
      return;
    }

    const user = req.user as usersInterface; // Retrieved from `authorizeUpload` middleware
    if (!user) {
      res.status(500).json({ message: "User information is missing. Please try again." });
      return;
    }

    const profilePictureUrl = req.file.path; // Cloudinary URL

    // If an old profile picture exists, delete it from Cloudinary
    if (user.profile_photo) {
      const publicId = extractPublicId(user.profile_photo);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { invalidate: true });
      }
    }

    // Update the user's profile_photo field with the new Cloudinary URL
    user.profile_photo = profilePictureUrl;
    await user.save();

    res.status(200).json({
      message: "Profile picture uploaded and updated successfully",
      profilePicture: profilePictureUrl,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message,success:false });
}
  else{
    console.error("Error uploading profile picture:", error);
    res.status(500).json({ message: "Error uploading profile picture", error: error instanceof Error ? error.message : "Unknown error" });
  }
}
};

// Update Profile Picture
const updateProfilePicture = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded or invalid file type. Only image files are allowed." });
      return;
    }

    const user = req.user as usersInterface; // Retrieved from `authorizeUpload` middleware
    if (!user) {
      res.status(500).json({ message: "User information is missing. Please try again." });
      return;
    }

    const newProfilePictureUrl = req.file.path; // Cloudinary URL

    // If an old profile picture exists, delete it from Cloudinary
    if (user.profile_photo) {
      const publicId = extractPublicId(user.profile_photo);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { invalidate: true });
      }
    }

    // Update the user's profile_photo field with the new Cloudinary URL
    user.profile_photo = newProfilePictureUrl;
    await user.save();

    res.status(200).json({
      message: "Profile picture updated successfully",
      profilePicture: newProfilePictureUrl,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message,success:false });
}
  else{
    console.error("Error updating profile picture:", error);
    res.status(500).json({ message: "Error updating profile picture", error: error instanceof Error ? error.message : "Unknown error" });
  }
}
};


// Delete Profile Picture
const deleteProfilePicture = async (req: Request, res: Response): Promise<void> => {
  try {
    const viewerId = await getUserIdFromToken(req, res);
    if (!viewerId) return;

    const targetUser = await findUserByUserId(viewerId, res);
    if (!targetUser) return;
    // Retrieve the current profile picture URL from the user's document
    const profilePictureUrl = targetUser.profile_photo;
    if (!profilePictureUrl) {
      res.status(400).json({ message: "No profile picture to delete" });
      return;
    }

    // Extract publicId from the URL using your utility function
    const publicId = extractPublicId(profilePictureUrl);
    if (!publicId) {
      res.status(400).json({ message: "Invalid profile picture URL" });
      return;
    }

    // Delete the image from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    if (result.result !== "ok") {
      res.status(500).json({ message: "Cloudinary failed to delete the image" });
      return;
    }

    // Clear the profile_photo field in the user's document
    targetUser.profile_photo = DEFAULT_IMAGE_URL; // Set to default image URL
    await targetUser.save();

    res.status(200).json({ message: "Profile picture deleted successfully" , profilePicture: targetUser.profile_photo});
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message,success:false });
}
  else{
    console.error("Error deleting profile picture:", error);
    res.status(500).json({ message: "Error deleting profile picture", error });
  }
}
};

// Get Profile Picture
const getProfilePicture = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = await validateTokenAndUser(req, res);
    if (!validation) return;

    const { targetUser } = validation;

    // Check if a profile picture exists
    if (!targetUser.profile_photo) {
      res.status(404).json({ message: "Profile picture not found" });
      return;
    }

    // Return the profile picture URL
    res.status(200).json({ profilePicture: targetUser.profile_photo });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message,success:false });
}
  else{
    console.error("Error retrieving profile picture:", error);
    res.status(500).json({ message: "Error retrieving profile picture", error });
  }
}
};

export { uploadProfilePicture, updateProfilePicture, deleteProfilePicture, getProfilePicture };