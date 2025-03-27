import { Request, Response } from "express";
import cloudinary from "../../../config/cloudinary.ts";
import { extractPublicId } from "../../services/cloudinary.service.ts";
import { validateTokenAndUser } from "../../utils/helper.ts";
import { usersInterface } from "../../models/users.model.ts";
// Upload Cover Photo


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
    console.error("Error uploading cover photo:", error);
    res.status(500).json({ message: "Error uploading cover photo", error: error instanceof Error ? error.message : "Unknown error" });
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
    console.error("Error updating cover photo:", error);
    res.status(500).json({ message: "Error updating cover photo", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

// Delete Cover Photo
const deleteCoverPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = await validateTokenAndUser(req, res);
    if (!validation) return;

    const { viewerId, userId, user } = validation;

    // Ensure the viewer is the same as the user (only the user can delete their own cover photo)
    if (viewerId !== userId) {
      res.status(403).json({ message: "You are not authorized to delete the cover photo for this user." });
      return;
    }

    // Retrieve the current cover photo URL from the user's document
    const coverPhotoUrl = user.cover_photo;
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
    user.cover_photo = "";
    await user.save();

    res.status(200).json({ message: "Cover photo deleted successfully" });
  } catch (error) {
    console.error("Error deleting cover photo:", error);
    res.status(500).json({ message: "Error deleting cover photo", error });
  }
};

// Get Cover Photo
const getCoverPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = await validateTokenAndUser(req, res);
    if (!validation) return;

    const { user } = validation;

    // Check if a cover photo exists
    if (!user.cover_photo) {
      res.status(404).json({ message: "Cover photo not found" });
      return;
    }

    // Return the cover photo URL
    res.status(200).json({ coverPhoto: user.cover_photo });
  } catch (error) {
    console.error("Error retrieving cover photo:", error);
    res.status(500).json({ message: "Error retrieving cover photo", error });
  }
};

export { uploadCoverPhoto, updateCoverPhoto, deleteCoverPhoto, getCoverPhoto };