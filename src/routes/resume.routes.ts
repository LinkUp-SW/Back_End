import { Router } from "express";
import {
  uploadResume,
  updateResume,
  deleteResume,
  getResume,
} from "../controllers/resumeController.ts";
import { authorizeUpload } from "../middleware/authMiddleware.ts";
import { multerPDFErrorHandler } from "../middleware/multer.error.handler.ts";

const router = Router();

// Route to upload a resume
router.post(
  "/profile/resume/:user_id",
  authorizeUpload, // Validate token and user_id first
  multerPDFErrorHandler("resume"), // Upload resume & Handle Multer errors 
  uploadResume
);

// Route to update a resume
router.put(
  "/profile/resume/:user_id",
  authorizeUpload, // Validate token and user_id first
  multerPDFErrorHandler("resume"), // Upload resume & Handle Multer errors 
  updateResume
);

// Route to delete a resume
router.delete("/profile/resume/:user_id", deleteResume);

// Get the resume
router.get("/profile/resume/:user_id", getResume);

export default router;