import { NextFunction, Request, Response } from "express";
import jobs from "../../models/jobs.model.ts";
import organizations from "../../models/organizations.model.ts";
import mongoose, { model } from "mongoose";


export const filterJobsByLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location } = req.params;
    
    const filteredJobs = await jobs.find({ 
      location: { $regex: location, $options: 'i' } 
    }).populate({
      model: organizations,
      path: 'organization_id',
    });
    
    if (filteredJobs.length === 0) {
      return res.status(404).json({ message: "No jobs found for this location" });
    }
    
    return res.status(200).json({ 
      message: "Jobs filtered by location successfully",
      count: filteredJobs.length,
      data: filteredJobs 
    });
  } catch (error) {
    next(error);
  }
};


export const filterJobsByExperienceLevel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { level } = req.params;
    
    const filteredJobs = await jobs.find({ experience_level: level })
      .populate({
        model: organizations,
        path: 'organization_id',
      });
    
    if (filteredJobs.length === 0) {
      return res.status(404).json({ message: "No jobs found for this experience level" });
    }
    
    return res.status(200).json({ 
      message: "Jobs filtered by experience level successfully",
      count: filteredJobs.length,
      data: filteredJobs 
    });
  } catch (error) {
    next(error);
  }
};

export const filterJobsByCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: "Invalid company ID format" });
    }
    
    const filteredJobs = await jobs.find({ 
      organization_id: companyId 
    }).populate({
      model: organizations,
      path: 'organization_id',
    });
    
    if (filteredJobs.length === 0) {
      return res.status(404).json({ message: "No jobs found for this company" });
    }
    
    return res.status(200).json({ 
      message: "Jobs filtered by company successfully",
      count: filteredJobs.length,
      data: filteredJobs 
    });
  } catch (error) {
    next(error);
  }
};


export const filterJobsBySalaryRange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { minSalary, maxSalary } = req.params;
    
    // Convert to numbers
    const min = Number(minSalary);
    const max = Number(maxSalary);
    
    // Validate inputs
    if (isNaN(min) || isNaN(max)) {
      return res.status(400).json({ message: "Salary range must be numeric" });
    }
    
    if (min > max) {
      return res.status(400).json({ message: "Minimum salary cannot be greater than maximum salary" });
    }
    
    const filteredJobs = await jobs.find({ 
      salary: { $gte: min, $lte: max } 
    }).populate({
      model: organizations,
      path: 'organization_id',
    });
    
    if (filteredJobs.length === 0) {
      return res.status(404).json({ message: "No jobs found in this salary range" });
    }
    
    return res.status(200).json({ 
      message: "Jobs filtered by salary range successfully",
      count: filteredJobs.length,
      data: filteredJobs 
    });
  } catch (error) {
    next(error);
  }
};
