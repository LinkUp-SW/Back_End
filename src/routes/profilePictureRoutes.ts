import { Router } from "express";
import upload from "../../config/multer.ts";
import { uploadProfilePicture } from "../controllers/profilePictureController.ts";

const router = Router();

// Route to upload a profile picture
router.post("/api/v1/users/profile-picture/:user_id", upload.single("profilePicture"), uploadProfilePicture);


export default router;
