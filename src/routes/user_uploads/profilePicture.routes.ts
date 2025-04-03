import { Router, Request, Response, NextFunction } from "express";
import {
  uploadProfilePicture,
  updateProfilePicture,
  deleteProfilePicture,
  getProfilePicture,
} from "../../controllers/user_uploads/profilePicture.controller.ts";
import { authorizeUpload } from "../../middleware/authMiddleware.ts";
import {multerImageErrorHandler} from "../../middleware/multerErrorHandler.ts";

const router = Router();



// Route to upload a profile picture
router.post(
  "/profile/profile-picture",
  authorizeUpload, // Validate token and user_id first
  multerImageErrorHandler("profilePicture"), // Upload profilePicture & Handle Multer errors
  uploadProfilePicture
);

// Route to update a profile picture
router.put(
  "/profile/profile-picture",
  authorizeUpload, // Validate token and user_id first
  multerImageErrorHandler("profilePicture"), // Upload profilePicture & Handle Multer errors
  updateProfilePicture
);

// Route to delete a profile picture
router.delete("/profile/profile-picture", deleteProfilePicture);

// Get the profile picture
router.get("/profile/profile-picture/:user_id", getProfilePicture);

export default router;