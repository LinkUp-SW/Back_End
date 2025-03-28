import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import SavedJob from "../../models/Jobs.model.ts";

/**
 * Save a job for applying later
 */
export const saveJobForLater = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, jobId } = req.body;
    
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid user ID or job ID format" });
    }
    
    // Check if job is already saved by this user
    const existingSavedJob = await SavedJob.findOne({ user_id: userId, job_id: jobId });
    
    if (existingSavedJob) {
      return res.status(409).json({ message: "Job already saved by this user" });
    }
    
    // Create new saved job entry
    const savedJob = new SavedJob({
      user_id: userId,
      job_id: jobId,
      saved_at: new Date()
    });
    
    await savedJob.save();
    
    return res.status(201).json({
      message: "Job saved successfully",
      data: savedJob
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all saved jobs for a specific user
 */
export const getSavedJobsByUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    
    // Find all saved jobs for this user and populate job details
    const savedJobs = await SavedJob.find({ user_id: userId })
      .populate({
        path: 'job_id',
        populate: {
          path: 'organization_id'
        }
      })
      .sort({ saved_at: -1 }); // Sort by most recently saved
    
    if (savedJobs.length === 0) {
      return res.status(404).json({ message: "No saved jobs found for this user" });
    }
    
    return res.status(200).json({
      message: "Retrieved saved jobs successfully",
      count: savedJobs.length,
      data: savedJobs
    });
  } catch (error) {
    next(error);
  }
};
