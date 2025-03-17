import { Router, Request, Response, NextFunction } from "express";
import {
  uploadProfilePicture,
  updateProfilePicture,
  deleteProfilePicture,
  getProfilePicture,
} from "../controllers/profilePictureController.ts";
import { authorizeUpload } from "../middleware/authMiddleware.ts";
import {multerImageErrorHandler} from "../middleware/multer.error.handler.ts";

const router = Router();



// Route to upload a profile picture
router.post(
  "/profile/profile-picture/:user_id",
  authorizeUpload, // Validate token and user_id first
  multerImageErrorHandler("profilePicture"), // Upload profilePicture & Handle Multer errors
  uploadProfilePicture
);

// Route to update a profile picture
router.put(
  "/profile/profile-picture/:user_id",
  authorizeUpload, // Validate token and user_id first
  multerImageErrorHandler("profilePicture"), // Upload profilePicture & Handle Multer errors
  updateProfilePicture
);

// Route to delete a profile picture
router.delete("/profile/profile-picture/:user_id", deleteProfilePicture);

// Get the profile picture
router.get("/profile/profile-picture/:user_id", getProfilePicture);

export default router;