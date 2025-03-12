import { Router } from "express";
import upload from "../../config/multer.ts";
import * as coverPhotoController from "../controllers/coverPhotoController.ts";

const router = Router();

// Route to upload a cover photo
router.post("/cover-photo/:user_id", upload.single("coverPhoto"), coverPhotoController.uploadCoverPhoto);

// Route to update a cover photo
router.put("/cover-photo/:user_id", upload.single("coverPhoto"), coverPhotoController.updateCoverPhoto);

// Route to delete a cover photo
router.delete("/cover-photo/:user_id", coverPhotoController.deleteCoverPhoto);

export default router;
