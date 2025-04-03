import { NextFunction, Request, Response } from "express";
import users from '../../models/users.model.ts';
import jobs, { jobsInterface } from "../../models/jobs.model.ts";
import mongoose from 'mongoose';
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import organizations from "../../models/organizations.model.ts";

/**
 * Get personalized job recommendations for the user
 * Algorithm:
 * - Match user skills with job required skills
 * - Consider user's experience level
 * - Exclude jobs user has already applied to
 * - Consider industries matching user's experience
 * - Return ranked job recommendations
 */
export const getPersonalizedJobRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;
    }
    catch (error) {
        console.error("Error validating token:", error);
        return res.status(401).json({ message: "Unauthorized" });
    }
};

export const getAllJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cursor = req.query.cursor as string || null;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        
        const query: any = {};
        
        // If a cursor is provided, fetch jobs after the cursor (using _id for cursor)
        if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
            query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
        }
        
        // Use aggregation to get jobs with only required fields and application count
        const jobsData = await jobs.aggregate([
            { $match: query },
            { $sort: { _id: -1 } },
            { $limit: limit + 1 },
            {
                $lookup: {
                    from: 'organizations',
                    localField: 'organization_id',
                    foreignField: '_id',
                    as: 'organization'
                }
            },
            { $unwind: '$organization' },
            {
                $lookup: {
                    from: 'applications',
                    localField: '_id',
                    foreignField: 'job_id',
                    as: 'applications'
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    location: 1,
                    workplace_type: 1,
                    'organization_id.name': '$organization.organization_name',
                    'organization_id.logo': '$organization.logo',
                    applications_count: { $size: '$applications' }
                }
            }
        ]);
        
        // Determine if there's a next page and calculate the next cursor
        const hasNextPage = jobsData.length > limit;
        const nextCursor = hasNextPage ? jobsData[limit - 1]._id : null;
        
        // Return only the requested number of jobs 
        const jobsToReturn = hasNextPage ? jobsData.slice(0, limit) : jobsData;
        
        const totalJobs = await jobs.countDocuments();
        
        return res.status(200).json({
            message: "Jobs retrieved successfully",
            count: jobsToReturn.length,
            total: totalJobs,
            data: jobsToReturn,
            nextCursor: nextCursor
        });
    } catch (error) {
        console.error("Error retrieving jobs:", error);
        next(error);
    }
};

export const getJobById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { jobId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: 'Invalid job ID format' });
        }
        
        const job = await jobs.findById(jobId)
            .populate({
                path: 'organization_id',
                model: 'organizations'
            });
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        
        return res.status(200).json({
            message: "Job retrieved successfully",
            data: job
        });
    } catch (error) {
        console.error("Error retrieving job:", error);
        next(error);
    }
};
