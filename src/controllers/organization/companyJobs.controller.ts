import { NextFunction, Request, Response } from "express";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import jobs from "../../models/jobs.model.ts";
import { getCompanyProfileById, validateUserIsCompanyAdmin } from "../../utils/helper.ts";
import jobApplications from "../../models/job_applications.model.ts";
import mongoose from "mongoose";

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
};

export const getCompanyJobsAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

        // Get all jobs for the company
        const companyJobs = await jobs.find({ organization_id });
        
        if (companyJobs.length === 0) {
            res.status(200).json({
                message: "No jobs found for this company",
                analytics: {
                    totalJobs: 0,
                    totalApplications: 0
                }
            });
            return;
        }

        // Extract job IDs
        const jobIds = companyJobs.map(job => job._id);

        // Get all applications for these jobs
        const applications = await jobApplications.find({
            job_id: { $in: jobIds }
        });

        // Calculate job status distribution
        const jobStatusCount = companyJobs.reduce((acc, job) => {
            const status = job.job_status || "Unknown";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Calculate application status distribution
        const applicationStatusCount = applications.reduce((acc, application) => {
            const status = application.application_status || "Unknown";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Calculate applications per job
        const applicationsPerJob = jobIds.map(jobId => {
            const job = companyJobs.find(j => j._id?.toString() === jobId?.toString());
            const jobApplicationsCount = applications.filter(app => 
                app.job_id.toString() === jobId?.toString()
            ).length;
            
            return {
                job_id: jobId,
                job_title: job?.job_title,
                applications_count: jobApplicationsCount
            };
        }).sort((a, b) => b.applications_count - a.applications_count);

        // Create analytics object
        const analytics = {
            totalJobs: companyJobs.length,
            openJobs: jobStatusCount["Open"] || 0,
            closedJobs: jobStatusCount["Closed"] || 0,
            totalApplications: applications.length,
            applicationStatusDistribution: applicationStatusCount,
            jobStatusDistribution: jobStatusCount,
            topJobs: applicationsPerJob.slice(0, 5), // Top 5 jobs by application count
        };

        res.status(200).json({
            message: "Company jobs analytics retrieved successfully",
            analytics
        });
    } catch (error) {
        next(error);
    }
};

