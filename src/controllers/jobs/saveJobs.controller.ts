import { NextFunction, Request, Response } from "express";
import users from '../../models/users.model.ts';
import jobs from "../../models/jobs.model.ts";
import mongoose from 'mongoose';
import { validateTokenAndGetUser } from "../../utils/helper.ts";


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


export const getSavedJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;
        
        const populatedUser = await users.findById(user._id).populate('saved_jobs');
        if (!populatedUser) {
            return res.status(404).json({ message: 'User not found'});
        }
        
        return res.status(200).json({ data: populatedUser.saved_jobs});
        
    } catch (error) {
        next(error);
    }
};