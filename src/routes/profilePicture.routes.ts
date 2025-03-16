import { Router } from "express";
import upload from "../../config/multer.ts";
import { uploadProfilePicture, updateProfilePicture,deleteProfilePicture, getProfilePicture } from "../controllers/profilePictureController.ts";

const router = Router();

// Route to upload a profile picture
router.post("/profile/profile-picture/:user_id", upload.single("profilePicture"), uploadProfilePicture);

// Route to update a profile picture
router.put("/profile/profile-picture/:user_id", upload.single("profilePicture"), updateProfilePicture);

// Route to delete a profile picture
router.delete("/profile/profile-picture/:user_id", deleteProfilePicture);

// Get the profile picture
router.get("/profile-picture/:user_id", getProfilePicture);


export default router;
