import { Router } from "express";
import upload from "../../config/multer.ts";
import { uploadCoverPhoto } from "../controllers/coverPhotoController.ts";

const router = Router();

// Route to upload a cover photo
router.post("/cover-photo/:user_id", upload.single("coverPhoto"), uploadCoverPhoto);

// Route to update a cover photo
router.put("/cover-photo/:user_id", upload.single("coverPhoto"), uploadCoverPhoto);

export default router;
