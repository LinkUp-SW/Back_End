import { NextFunction, Request, Response } from "express";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import jobs from "../../models/jobs.model.ts";
import { getCompanyProfileById, validateUserIsCompanyAdmin } from "../../utils/helper.ts";

export const createJobFromCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { organization_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;

        // Extract job details from request body
        const { 
            job_title, 
            location, 
            job_type,
            workplace_type,
            experience_level,
            description,
            qualifications,
            responsibilities,
            benefits,
            targetted_skills,
            receive_applicants_by,
            receiving_method,
            salary,
            job_status
        } = req.body;

        // Create new job
        const newJob = new jobs({
            organization_id,
            job_title,
            location,
            job_type,
            workplace_type,
            experience_level,
            description,
            qualifications: qualifications || [],
            responsibilities: responsibilities || [],
            benefits: benefits || [],
            targetted_skills: targetted_skills || [],
            receive_applicants_by,
            receiving_method,
            salary,
            posted_time: new Date(),
            applied_applications: [],
            job_status: job_status || "Open"
        });

        await newJob.save();

        res.status(201).json({
            message: "Job posted successfully",
            job: newJob
        });
    } catch (error) {
        next(error);
    }
};

export const getCompanyJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { organization_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Fetch jobs
        const companyJobs = await jobs.find({ organization_id })
            .sort({ posted_time: -1 });  // Sort by most recent

        res.status(200).json({
            jobs: companyJobs,
            count: companyJobs.length
        });
    } catch (error) {
        next(error);
    }
};

export const changeJobStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { organization_id, job_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;

        // Extract new status from request body
        const { job_status } = req.body;

        // Update job status
        const updatedJob = await jobs.findOneAndUpdate(
            { _id: job_id, organization_id },
            { job_status },
            { new: true }
        );

        if (!updatedJob) {
            res.status(404).json({ message: "Job not found" });
            return;
        }

        res.status(200).json({
            message: "Job status updated successfully",
            job: updatedJob
        });
    } catch (error) {
        next(error);
    }
}