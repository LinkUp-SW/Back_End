import { NextFunction, Request, Response } from "express";
import users from '../../models/users.model.ts';
import jobs from "../../models/jobs.model.ts";
import mongoose from 'mongoose';
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import { paginatedJobQuery, getTimeAgoStage } from "../../utils/database.helper.ts";

export const saveJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { jobId } = req.params;
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({message: 'Invalid job ID format'});
        }
        
        const job = await jobs.findById(jobId);
        if (!job) {
            return res.status(404).json({message: 'Job not found'});
        }
        
        const isJobSaved = user.saved_jobs.some(savedJob => 
            savedJob._id == jobId
        );
        
        if (isJobSaved) {
            return res.status(400).json({message: 'Job is already saved'
            });
        }
        else {
            user.saved_jobs.push(job);
        }
        
        await user.save();
        
        return res.status(200).json({ message: 'Job saved successfully'});
        
    } catch (error) {
        next(error);
    }
};

export const unsaveJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { jobId } = req.params;
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;
        
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({message: 'Invalid job ID format'});
        }
        
        const job = await jobs.findById(jobId);
        if (!job) {
            return res.status(404).json({message: 'Job not found'});
        }
        
        const isJobSaved = user.saved_jobs.some(savedJob => 
            savedJob._id == jobId
        );
        
        if (!isJobSaved) {
            return res.status(400).json({message: 'Job is not saved'});
        }
        
        user.saved_jobs = user.saved_jobs.filter(savedJob => 
            savedJob._id != jobId
        );
        
        await user.save();
        
        return res.status(200).json({ message: 'Job unsaved successfully'});
        
    } catch (error) {
        next(error);
    }
}

export const getSavedJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;
        
        // Get the saved job IDs
        const savedJobIds = user.saved_jobs.map(jobId => 
            new mongoose.Types.ObjectId(jobId.toString())
        );
        
        if (savedJobIds.length === 0) {
            return res.status(200).json({
                message: "No saved jobs found",
                count: 0,
                total: 0,
                data: [],
                nextCursor: null
            });
        }
        
        // Use the same formatting as getAllJobs
        const extraStages = [
            getTimeAgoStage(),
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
            {
                $project: {
                    _id: 1,
                    job_title: 1,
                    location: 1,
                    workplace_type: 1,
                    experience_level: 1, 
                    salary: 1,
                    posted_time: 1,
                    timeAgo: 1,
                    organization: {
                        _id: '$org._id',
                        name: '$org.name',
                        logo: '$org.logo'
                    }
                }
            }
        ];
        
        // Handle pagination
        const cursor = req.query.cursor as string || null;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        
        // Query jobs using IDs from saved_jobs
        const result = await paginatedJobQuery(
            { _id: { $in: savedJobIds } },
            cursor,
            limit,
            { _id: -1 },
            extraStages
        );
        
        return res.status(200).json({
            message: "Saved jobs retrieved successfully",
            count: result.count,
            total: result.total,
            data: result.data,
            nextCursor: result.nextCursor
        });
        
    } catch (error) {
        console.error("Error retrieving saved jobs:", error);
        next(error);
    }
};