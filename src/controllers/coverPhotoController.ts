import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary.ts"
import { validateUserId, findClientById, checkFileUploaded } from "../utils/validators.ts";
import { extractPublicId } from "../services/cloudinaryService.ts";

// Upload Cover Photo
export const uploadCoverPhoto = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate the user_id parameter using the common helper.
        const user_id = validateUserId(req, res);
        if (!user_id) return;

        // Ensure a file was uploaded.
        if (!checkFileUploaded(req, res)) return;

        // Retrieve the new cover photo URL from Cloudinary via multer.
        // Use optional chaining if needed.
        const coverPhotoUrl = req.file?.path;
        if (!coverPhotoUrl) {
            res.status(400).json({ message: "Error processing file upload" });
            return;
        }

        // Find the client in the database using the common helper.
        const client = await findClientById(user_id, res);
        if (!client) return;

        // Update the client's cover_photo field with the new URL.
        client.cover_photo = coverPhotoUrl;
        await client.save();

        res.status(200).json({
            message: "Cover photo uploaded successfully",
            coverPhoto: coverPhotoUrl,
        });
    } catch (error) {
        console.error("Error uploading cover photo:", error);
        res.status(500).json({ message: "Error uploading cover photo", error });
    }
};