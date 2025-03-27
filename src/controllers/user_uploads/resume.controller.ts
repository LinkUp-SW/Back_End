import { Request, Response } from "express";
import cloudinary from "../../../config/cloudinary.ts";
import { extractPublicId } from "../../services/cloudinary.service.ts";
import { validateTokenAndUser, validateFileUpload } from "../../utils/helperFunctions.utils.ts";
import { usersInterface } from "../../models/users.model.ts";

// Upload Resume
const uploadResume = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded or invalid file type. Only .pdf files are allowed." });
      return;
    }

    // Ensure `req.user` is defined
    const user = req.user as usersInterface;
    if (!user) {
      res.status(500).json({ message: "User information is missing. Please try again." });
      return;
    }

    const resumeUrl = req.file.path; // Cloudinary URL

    // If an old resume exists, delete it from Cloudinary
    if (user.resume) {
      let publicId = extractPublicId(user.resume);
      if (publicId) {
        // Append '.pdf' if it is not already part of the publicId.
        if (!publicId.endsWith('.pdf')) {
            publicId += '.pdf';
        }
        await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: "raw" });
      }
    }

    // Update the user's resume field with the new Cloudinary URL
    user.resume = resumeUrl;
    await user.save();

    res.status(200).json({
      message: "Resume uploaded and updated successfully",
      resume: resumeUrl,
    });
  } catch (error) {
    console.error("Error uploading resume:", error);
    res.status(500).json({ message: "Error uploading resume", error: error instanceof Error ? error.message : "Unknown error" });
  }
};




// Update Resume
const updateResume = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded or invalid file type. Only .pdf files are allowed." });
      return;
    }

    // Ensure `req.user` is defined
    const user = req.user as usersInterface;
    if (!user) {
      res.status(500).json({ message: "User information is missing. Please try again." });
      return;
    }

    const newResumeUrl = req.file.path; // Cloudinary URL

    // If an old resume exists, delete it from Cloudinary
    if (user.resume) {
      let publicId = extractPublicId(user.resume);
      if (publicId) {
        // Append '.pdf' if it is not already part of the publicId.
        if (!publicId.endsWith('.pdf')) {
            publicId += '.pdf';
        }
        await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: "raw" });
      }
    }

    // Update the user's resume field with the new Cloudinary URL
    user.resume = newResumeUrl;
    await user.save();

    res.status(200).json({
      message: "Resume updated successfully",
      resume: newResumeUrl,
    });
  } catch (error) {
    console.error("Error updating resume:", error);
    res.status(500).json({ message: "Error updating resume", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

// Delete Resume
const deleteResume = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = await validateTokenAndUser(req, res);
    if (!validation) return;

    const { viewerId, targetUser } = validation;

    // Ensure the viewer is the same as the user (only the user can delete their own resume)
    if (viewerId !== targetUser) {
      res.status(403).json({ message: "You are not authorized to delete the resume for this user." });
      return;
    }

    // Retrieve the current resume URL from the user's document
    const resumeUrl = targetUser.resume;
    if (!resumeUrl) {
      res.status(400).json({ message: "No resume to delete" });
      return;
    }

    // Extract publicId from the URL using your utility function
    let publicId = extractPublicId(resumeUrl);
    if (!publicId) {
      res.status(400).json({ message: "Invalid resume URL" });
      return;
    }

    // Append '.pdf' if it is not already part of the publicId.
    if (!publicId.endsWith('.pdf')) {
        publicId += '.pdf';
    }

    // Delete the resume from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: "raw" });
    if (result.result !== "ok") {
      res.status(500).json({ message: "Cloudinary failed to delete the resume" });
      return;
    }

    // Clear the resume field in the user's document
    targetUser.resume = "";
    await targetUser.save();

    res.status(200).json({ message: "Resume deleted successfully" });
  } catch (error) {
    console.error("Error deleting resume:", error);
    res.status(500).json({ message: "Error deleting resume", error });
  }
};

// Get Resume
const getResume = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = await validateTokenAndUser(req, res);
    if (!validation) return;

    const { targetUser } = validation;

    // Check if a resume exists
    if (!targetUser.resume) {
      res.status(404).json({ message: "Resume not found" });
      return;
    }

    // Return the resume URL
    res.status(200).json({ resume: targetUser.resume });
  } catch (error) {
    console.error("Error retrieving resume:", error);
    res.status(500).json({ message: "Error retrieving resume", error });
  }
};

export { uploadResume, updateResume, deleteResume, getResume };