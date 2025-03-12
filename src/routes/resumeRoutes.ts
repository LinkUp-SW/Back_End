import { Router } from "express";
import upload from "../../config/multer.ts";
import * as resumeController from "../controllers/resumeController.ts";

const router = Router();

// Route to upload a resume
router.post("/resume/:user_id", upload.single("resume"), resumeController.uploadResume);

// Route to update a resume
router.put("/resume/:user_id", upload.single("resume"), resumeController.updateResume);


export default router;