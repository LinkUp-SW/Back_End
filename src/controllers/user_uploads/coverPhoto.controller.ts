import { Request, Response } from "express";
import cloudinary from "../../../config/cloudinary.ts";
import { extractPublicId } from "../../services/cloudinary.service.ts";
import { validateTokenAndUser , getUserIdFromToken} from "../../utils/helperFunctions.utils.ts";
import { usersInterface } from "../../models/users.model.ts";
import {findUserByUserId} from "../../utils/database.helper.ts";
const DEFAULT_IMAGE_URL = "https://res.cloudinary.com/dyhnxqs6f/image/upload/v1719229880/meme_k18ky2_c_crop_w_674_h_734_x_0_y_0_u0o1yz.png";


// Upload Cover Photo
const uploadCoverPhoto = async (req: Request, res: Response): Promise<void> => {
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

    const coverPhotoUrl = req.file.path; // Cloudinary URL

    // If an old cover photo exists, delete it from Cloudinary
    if (user.cover_photo) {
      const publicId = extractPublicId(user.cover_photo);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { invalidate: true });
      }
    }

    // Update the user's cover_photo field with the new Cloudinary URL
    user.cover_photo = coverPhotoUrl;
    await user.save();

    res.status(200).json({
      message: "Cover photo uploaded and updated successfully",
      coverPhoto: coverPhotoUrl,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message,success:false });
}
  else{
    console.error("Error uploading cover photo:", error);
    res.status(500).json({ message: "Error uploading cover photo", error: error instanceof Error ? error.message : "Unknown error" });
  }
}
};

// Update Cover Photo
const updateCoverPhoto = async (req: Request, res: Response): Promise<void> => {
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

    const newCoverPhotoUrl = req.file.path; // Cloudinary URL

    // If an old cover photo exists, delete it from Cloudinary
    if (user.cover_photo) {
      const publicId = extractPublicId(user.cover_photo);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { invalidate: true });
      }
    }

    // Update the user's cover_photo field with the new Cloudinary URL
    user.cover_photo = newCoverPhotoUrl;
    await user.save();

    res.status(200).json({
      message: "Cover photo updated successfully",
      coverPhoto: newCoverPhotoUrl,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message,success:false });
}
  else{

    console.error("Error updating cover photo:", error);
    res.status(500).json({ message: "Error updating cover photo", error: error instanceof Error ? error.message : "Unknown error" });
  }
}
};

// Delete Cover Photo
const deleteCoverPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const viewerId = await getUserIdFromToken(req, res);
    if (!viewerId) return;

    const targetUser = await findUserByUserId(viewerId, res);
    if (!targetUser) return;

    // Retrieve the current cover photo URL from the user's document
    const coverPhotoUrl = targetUser.cover_photo;
    if (!coverPhotoUrl) {
      res.status(400).json({ message: "No cover photo to delete" });
      return;
    }

    // Extract publicId from the URL using your utility function
    const publicId = extractPublicId(coverPhotoUrl);
    if (!publicId) {
      res.status(400).json({ message: "Invalid cover photo URL" });
      return;
    }

    // Delete the image from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    if (result.result !== "ok") {
      res.status(500).json({ message: "Cloudinary failed to delete the image" });
      return;
    }

    // Clear the cover_photo field in the user's document
    targetUser.cover_photo = DEFAULT_IMAGE_URL;
    await targetUser.save();

    res.status(200).json({ message: "Cover photo deleted successfully" , coverPhoto: targetUser.cover_photo });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message,success:false });
}
  else{
    console.error("Error deleting cover photo:", error);
    res.status(500).json({ message: "Error deleting cover photo", error });
  }
}
};

// Get Cover Photo
const getCoverPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = await validateTokenAndUser(req, res);
    if (!validation) return;

    const { targetUser } = validation;

    // Check if a cover photo exists
    if (!targetUser.cover_photo) {
      res.status(404).json({ message: "Cover photo not found" });
      return;
    }

    // Return the cover photo URL
    res.status(200).json({ coverPhoto: targetUser.cover_photo });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message,success:false });
}
  else{
    console.error("Error retrieving cover photo:", error);
    res.status(500).json({ message: "Error retrieving cover photo", error });
  }
}
};

export { uploadCoverPhoto, updateCoverPhoto, deleteCoverPhoto, getCoverPhoto };