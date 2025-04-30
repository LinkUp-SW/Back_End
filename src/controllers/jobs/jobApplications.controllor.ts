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
            .select('_id bio.first_name bio.last_name bio.headline email bio.contact_info.phone_number bio.contact_info.country_code profile_photo location resume');
        
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

export const getAppliedJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        // Find all job applications for this user
        const applications = await jobApplications.find({ user_id: user._id });
        
        // Extract job IDs from applications
        const appliedJobIds = applications.map(application => 
            new mongoose.Types.ObjectId(application.job_id.toString())
        );
        
        if (appliedJobIds.length === 0) {
            res.status(200).json({
                message: "No applied jobs found",
                data: []
            });
            return;
        }
        
        // Get all applied jobs with organization info and application status
        const appliedJobs = await jobs.aggregate([
            { 
                $match: { _id: { $in: appliedJobIds } }
            },
            {
                $lookup: {
                    from: 'organizations',
                    localField: 'organization_id',
                    foreignField: '_id',
                    as: 'org'
                }
            },
            {
                $unwind: {
                    path: '$org',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Add application status to each job
            {
                $lookup: {
                    from: 'jobapplications',
                    let: { jobId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$job_id', '$$jobId'] },
                                        { $eq: ['$user_id', new mongoose.Types.ObjectId(user._id)] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'application'
                }
            },
            {
                $unwind: {
                    path: '$application',
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $project: {
                    _id: 1,
                    job_title: 1,
                    location: 1,
                    workplace_type: 1,
                    experience_level: 1, 
                    salary: 1,
                    posted_time: 1,
                    application_status: '$application.application_status',
                    application_id: '$application._id',
                    organization: {
                        _id: '$org._id',
                        name: '$org.name',
                        logo: '$org.logo'
                    }
                }
            },
            { $sort: { _id: -1 } }
        ]);
        
        res.status(200).json({
            message: "Applied jobs retrieved successfully",
            count: appliedJobs.length,
            data: appliedJobs
        });
    } catch (error) {
        next(error);
    }
}

export const changeJobApplicationStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { application_id } = req.params;
        const { status } = req.body; 

        // Validate application_id
        if (!application_id || !mongoose.Types.ObjectId.isValid(application_id)) {
            res.status(400).json({ message: "Valid application ID is required" });
            return;
        }

        // Check if job application exists
        const jobApplication = await jobApplications.findById(application_id);
        if (!jobApplication) {
            res.status(404).json({ message: "Job application not found" });
            return;
        }

        // Get the job that this application is for
        const job = await jobs.findById(jobApplication.job_id);
        if (!job) {
            res.status(404).json({ message: "Job not found" });
            return;
        }

        // Update the application status
        jobApplication.application_status = status;
        await jobApplication.save();

        res.status(200).json({
            message: "Job application status updated successfully",
            data: jobApplication
        });
    } catch (error) {
        next(error);
    }
}