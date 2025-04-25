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
            screening_questions,
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
            screening_questions,
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

/**
 * Edit an existing job
 */
export const editJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        
        // Check if job exists and belongs to this organization
        const existingJob = await jobs.findOne({ 
            _id: job_id, 
            organization_id 
        });
        
        if (!existingJob) {
            res.status(404).json({ message: "Job not found or doesn't belong to this organization" });
            return;
        }
        
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
            screening_questions,
            salary,
            job_status
        } = req.body;
        
        // Update job with new values
        const updatedJob = await jobs.findByIdAndUpdate(
            job_id,
            {
                $set: {
                    job_title: job_title || existingJob.job_title,
                    location: location || existingJob.location,
                    job_type: job_type || existingJob.job_type,
                    workplace_type: workplace_type || existingJob.workplace_type,
                    experience_level: experience_level || existingJob.experience_level,
                    description: description || existingJob.description,
                    qualifications: qualifications || existingJob.qualifications,
                    responsibilities: responsibilities || existingJob.responsibilities,
                    benefits: benefits || existingJob.benefits,
                    targetted_skills: targetted_skills || existingJob.targetted_skills,
                    receive_applicants_by: receive_applicants_by || existingJob.receive_applicants_by,
                    receiving_method: receiving_method || existingJob.receiving_method,
                    screening_questions: screening_questions || existingJob.screening_questions,
                    salary: salary || existingJob.salary,
                    job_status: job_status || existingJob.job_status
                }
            },
            { new: true }
        );
        
        res.status(200).json({
            message: "Job updated successfully",
            job: updatedJob
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