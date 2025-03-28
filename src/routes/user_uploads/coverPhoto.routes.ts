import { Router } from "express";
import {
  uploadCoverPhoto,
  updateCoverPhoto,
  deleteCoverPhoto,
  getCoverPhoto,
} from "../../controllers/user_uploads/coverPhoto.controller.ts";
import { authorizeUpload } from "../../middleware/authMiddleware.ts";
import { multerImageErrorHandler } from "../../middleware/multerErrorHandler.ts";

const router = Router();

// Route to upload a cover photo
router.post(
  "/profile/cover-photo",
  authorizeUpload, // Validate token and user_id first
  multerImageErrorHandler("coverPhoto"), // Upload coverPhoto & Handle Multer errors
  uploadCoverPhoto
);

// Route to update a cover photo
router.put(
  "/profile/cover-photo",
  authorizeUpload, // Validate token and user_id first
  multerImageErrorHandler("coverPhoto"), // Update coverPhoto & Handle Multer errors 
  updateCoverPhoto
);

// Route to delete a cover photo
router.delete("/profile/cover-photo", deleteCoverPhoto);

// Get the cover photo
router.get("/profile/cover-photo/:user_id", getCoverPhoto);

export default router;