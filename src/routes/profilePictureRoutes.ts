import { Router } from "express";
import upload from "../../config/multer.ts";
import { uploadProfilePicture, updateProfilePicture } from "../controllers/profilePictureController.ts";

const router = Router();

// Route to upload a profile picture
router.post("/api/v1/users/profile-picture/:user_id", upload.single("profilePicture"), uploadProfilePicture);

// Route to update a profile picture
router.put("/api/v1/users/profile-picture/:user_id", upload.single("profilePicture"), updateProfilePicture);

export default router;
