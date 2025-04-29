import { NextFunction, Request, Response } from "express";
import users from '../../models/users.model.ts';
import jobApplications from '../../models/job_applications.model.ts';
import jobs from '../../models/jobs.model.ts';
import mongoose from 'mongoose';
import { validateTokenAndGetUser } from "../../utils/helper.ts";

export const ApplyForJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        // Get user data with selected fields only
        const userData = await users.findById(user._id)
            .select('_id bio.first_name bio.last_name bio.headline bio.contact_info.phone_number bio.contact_info.country_code profile_photo location resume');
        
        if (!userData) {
            res.status(404).json({ message: "User not found" });
            return;
        }
    
        // Return the user data that would be needed for a job application
        res.status(200).json({ 
            data: userData,
            message: "User data retrieved successfully for job application"
        });
    } catch (error) {
        next(error);
    }
}

export const CreateJobApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { job_id } = req.params;
        const { first_name, last_name, email_address, phone_number, country_code, resume } = req.body;

        // Validate job_id
        if (!job_id || !mongoose.Types.ObjectId.isValid(job_id)) {
            res.status(400).json({ message: "Valid job ID is required" });
            return;
        }

        // Check if job exists
        const job = await jobs.findById(job_id);
        if (!job) {
            res.status(404).json({ message: "Job not found" });
            return;
        }

        // Check if user has already applied for this job
        const existingApplication = await jobApplications.findOne({
            job_id,
            user_id: user._id
        });

        if (existingApplication) {
            res.status(400).json({ message: "You have already applied for this job" });
            return;
        }

        // Create new job application
        const newJobApplication = new jobApplications({
            job_id,
            user_id: user._id,
            first_name,
            last_name,
            email_address,
            phone_number,
            country_code,
            resume,
            application_status: "Pending"
        });

        await newJobApplication.save();

        // Add application to job's applied_applications array
        await jobs.findByIdAndUpdate(job_id, {
            $push: { applied_applications: newJobApplication._id }
        });

        // Add job to user's applied_jobs array (assuming this field exists in your user model)
        await users.findByIdAndUpdate(user._id, {
            $push: { applied_jobs: job_id }
        });

        res.status(201).json({
            message: "Job application submitted successfully",
            application: {
                _id: newJobApplication._id,
                job_id: newJobApplication.job_id,
                application_status: newJobApplication.application_status,
            }
        });
    } catch (error) {
        next(error);
    }
}

export const GetJobApplications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { job_id } = req.params;

        // Validate job_id
        if (!job_id || !mongoose.Types.ObjectId.isValid(job_id)) {
            res.status(400).json({ message: "Valid job ID is required" });
            return;
        }
        // Check if job exists
        const job = await jobs.findById(job_id);
        if (!job) {
            res.status(404).json({ message: "Job not found" });
            return;
        }

        const jobApplicationsList = await jobApplications.find({ job_id: job._id })
        .populate({
            path: "user_id",
            select: "_id bio.first_name bio.last_name bio.headline bio.contact_info.phone_number bio.contact_info.country_code profile_photo location resume",
        });

        res.status(200).json({ data: jobApplicationsList });
    } catch (error) {
        next(error);
    }
}

export const GetJobApplicationDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { application_id } = req.params;

        // Validate application_id
        if (!application_id || !mongoose.Types.ObjectId.isValid(application_id)) {
            res.status(400).json({ message: "Valid application ID is required" });
            return;
        }

        // Check if job application exists
        const jobApplication = await jobApplications.findById(application_id)
            .populate("job_id")
            .populate("user_id");

        if (!jobApplication) {
            res.status(404).json({ message: "Job application not found" });
            return;
        }

        res.status(200).json({ data: jobApplication });
    } catch (error) {
        next(error);
    }
}
