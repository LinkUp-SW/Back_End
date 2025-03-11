import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary.ts"
import { validateUserId, findClientById, checkFileUploaded } from "../utils/validators.ts";
import { extractPublicId } from "../services/cloudinaryService.ts";



// Upload Profile Picture
export const uploadProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate user_id parameter
        const user_id = validateUserId(req, res);
        if (!user_id) return;

        // Ensure a file was uploaded
        if (!checkFileUploaded(req, res)) return;

        // Retrieve Cloudinary URL from the file uploaded by multer
        const profilePictureUrl = req.file?.path;
        if (!profilePictureUrl) {
            res.status(400).json({ message: "Error processing file upload" });
            return;
        }

        // Find the client in the database
        const client = await findClientById(user_id, res);
        if (!client) return;

        // Update the client's profile_photo field with the new URL
        client.profile_photo = profilePictureUrl;
        await client.save();

        res.status(200).json({
            message: "Profile picture uploaded and updated successfully",
            profilePicture: profilePictureUrl
        });
    } catch (error) {
        console.error("Error uploading profile picture:", error);
        res.status(500).json({ message: "Error uploading profile picture", error });
    }
};

// Update Profile Picture

export const updateProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate user_id parameter
        const user_id = validateUserId(req, res);
        if (!user_id) return;

        // Ensure a new file was uploaded
        if (!checkFileUploaded(req, res)) return;

        // Find the client in the database
        const client = await findClientById(user_id, res);
        if (!client) return;

        // Retrieve the old Cloudinary URL from the client's document
        const oldProfilePictureUrl = client.profile_photo;

        // If an old URL exists, extract its publicId and delete the old image from Cloudinary
        if (oldProfilePictureUrl) {
            const publicId = extractPublicId(oldProfilePictureUrl);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId, { invalidate: true });
            }
        }

        // Update the client's profile_photo field with the new Cloudinary URL
        const newProfilePictureUrl = req.file?.path;
        if (newProfilePictureUrl) {
            client.profile_photo = newProfilePictureUrl;
        } else {
            res.status(400).json({ message: "Error processing file upload" });
            return;
        }
        await client.save();

        res.status(200).json({
            message: "Profile picture updated successfully",
            profilePicture: newProfilePictureUrl,
        });
    } catch (error) {
        console.error("Error updating profile picture:", error);
        res.status(500).json({ message: "Error updating profile picture", error });
    }
};





