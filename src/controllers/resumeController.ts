import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary.ts"
import { validateUserId, findClientById, checkFileUploaded } from "../utils/validators.ts";
import { extractPublicId } from "../services/cloudinaryService.ts";

// Upload resume

export const uploadResume = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate user_id parameter using the common helper
        const user_id = validateUserId(req, res);
        if (!user_id) return;

        // Ensure that a file was uploaded
        if (!checkFileUploaded(req, res)) return;

        // Retrieve the new resume URL from Cloudinary via multer
        const resumeUrl = req.file?.path;
        if (!resumeUrl) {
            res.status(400).json({ message: "Error processing file upload" });
            return;
        }

        // Find the client document in the database
        const client = await findClientById(user_id, res);
        if (!client) return;

        // Update the client's resume field with the new URL
        client.resume = resumeUrl;
        await client.save();

        res.status(200).json({
            message: "Resume uploaded successfully",
            resume: resumeUrl
        });
    } catch (error) {
        console.error("Error uploading resume:", error);
        res.status(500).json({ message: "Error uploading resume", error });
    }
};
