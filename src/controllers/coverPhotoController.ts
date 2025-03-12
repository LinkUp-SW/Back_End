import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary.ts"
import { validateUserId, findClientById, checkFileUploaded } from "../utils/validators.ts";
import { extractPublicId } from "../services/cloudinaryService.ts";

// Upload Cover Photo
const uploadCoverPhoto = async (req: Request, res: Response): Promise<void> => {
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

// Update Cover Photo
const updateCoverPhoto = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate user_id from URL parameters
        const user_id = validateUserId(req, res);
        if (!user_id) return;

        // Ensure that a new file was uploaded
        if (!checkFileUploaded(req, res)) return;

        // Find the client document in the database
        const client = await findClientById(user_id, res);
        if (!client) return;

        // Get the current cover photo URL from the client document
        const oldCoverPhotoUrl = client.cover_photo;

        // If there is an old cover photo, extract its publicId and delete it from Cloudinary
        if (oldCoverPhotoUrl) {
            const publicId = extractPublicId(oldCoverPhotoUrl);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId, { invalidate: true });
            }
        }

        // Retrieve the new cover photo URL from the file upload 
        const newCoverPhotoUrl = req.file?.path;
        if (!newCoverPhotoUrl) {
            res.status(400).json({ message: "Error processing the file upload" });
            return;
        }

        // Update the client's cover_photo field with the new URL and save the document
        client.cover_photo = newCoverPhotoUrl;
        await client.save();

        res.status(200).json({
            message: "Cover photo updated successfully",
            coverPhoto: newCoverPhotoUrl,
        });
    } catch (error) {
        console.error("Error updating cover photo:", error);
        res.status(500).json({ message: "Error updating cover photo", error });
    }
};

const deleteCoverPhoto = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate the user_id parameter.
        const user_id = validateUserId(req, res);
        if (!user_id) return;

        // Find the client document in the database.
        const client = await findClientById(user_id, res);
        if (!client) return;

        // Retrieve the current cover photo URL from the client's document.
        const coverPhotoUrl = client.cover_photo;
        if (!coverPhotoUrl) {
            res.status(400).json({ message: "No cover photo to delete" });
            return;
        }

        // Extract publicId from the URL.
        const publicId = extractPublicId(coverPhotoUrl);
        if (!publicId) {
            res.status(400).json({ message: "Invalid cover photo URL" });
            return;
        }

        // Delete the image from Cloudinary.
        const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
        if (result.result !== "ok") {
            res.status(500).json({ message: "Cloudinary failed to delete the image" });
            return;
        }

        // Clear the cover_photo field in the client's document.
        client.cover_photo = "";
        await client.save();

        res.status(200).json({ message: "Cover photo deleted successfully" });
    } catch (error) {
        console.error("Error deleting cover photo:", error);
        res.status(500).json({ message: "Error deleting cover photo", error });
    }
};

export { uploadCoverPhoto, updateCoverPhoto, deleteCoverPhoto };