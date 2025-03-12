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


// Update resume
export const updateResume = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate user_id parameter using the common helper.
        const user_id = validateUserId(req, res);
        if (!user_id) return;

        // Ensure that a new file was uploaded.
        if (!checkFileUploaded(req, res)) return;

        // Find the client document in the database.
        const client = await findClientById(user_id, res);
        if (!client) return;

        // Retrieve the old resume URL from the client's document.
        const oldResumeUrl = client.resume;
        if (!oldResumeUrl) {
            res.status(400).json({ message: "No resume found to update" });
            return;
        }

        // Extract the publicId from the old Cloudinary URL.
        let publicId = extractPublicId(oldResumeUrl);
        if (!publicId) {
            res.status(400).json({ message: "Invalid resume URL" });
            return;
        }

        // Append '.pdf' if it is not already part of the publicId.
        if (!publicId.endsWith('.pdf')) {
            publicId += '.pdf';
        }

        // Delete the old resume from Cloudinary.
        await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: "raw" });

        // Retrieve the new resume URL from the file upload.
        const newResumeUrl = req.file?.path;
        if (!newResumeUrl) {
            res.status(400).json({ message: "Error processing file upload" });
            return;
        }

        // Update the client's resume field with the new URL and save the document.
        client.resume = newResumeUrl;
        await client.save();

        res.status(200).json({
            message: "Resume updated successfully",
            resume: newResumeUrl,
        });
    } catch (error) {
        console.error("Error updating resume:", error);
        res.status(500).json({ message: "Error updating resume", error });
    }
};

// Delete Resume
export const deleteResume = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate the user_id parameter using the helper.
        const user_id = validateUserId(req, res);
        if (!user_id) return;

        // Retrieve the client document from the database.
        const client = await findClientById(user_id, res);
        if (!client) return;

        // Get the stored resume URL from the client's document.
        const resumeUrl = client.resume;
        if (!resumeUrl) {
            res.status(400).json({ message: "No resume to delete" });
            return;
        }

        // Extract publicId from the stored resume URL.
        let publicId = extractPublicId(resumeUrl);
        if (!publicId) {
            res.status(400).json({ message: "Invalid resume URL" });
            return;
        }

        // Append the '.pdf' extension if not already present.
        if (!publicId.endsWith('.pdf')) {
            publicId += '.pdf';
        }

        // Delete the resume from Cloudinary using "raw" resource type.
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: "raw", invalidate: true });
        if (result.result !== "ok") {
            res.status(500).json({ message: "Cloudinary failed to delete the resume" });
            return;
        }

        // Clear the resume field in the client's document.
        client.resume = "";
        await client.save();

        res.status(200).json({ message: "Resume deleted successfully" });
    } catch (error) {
        console.error("Error deleting resume:", error);
        res.status(500).json({ message: "Error deleting resume", error });
    }
};

// Get Resume
export const getResume = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate the user_id parameter using the helper.
        const user_id = validateUserId(req, res);
        if (!user_id) return;

        // Retrieve the client document from the database.
        const client = await findClientById(user_id, res);
        if (!client) return;

        // Check if the client has a resume.
        if (!client.resume) {
            res.status(404).json({ message: "Resume not found" });
            return;
        }

        // Return the resume URL.
        res.status(200).json({ resume: client.resume });
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving resume", error });
    }
};