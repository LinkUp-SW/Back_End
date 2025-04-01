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
    const { levels } = req.params;
    
    // Split comma-separated levels into an array
    const levelArray = levels.split(',');
    
    const filteredJobs = await jobs.find({ experience_level: { $in: levelArray } })
      .populate({
        model: organizations,
        path: 'organization_id',
      });
    
    if (filteredJobs.length === 0) {
      return res.status(404).json({ message: "No jobs found for the selected experience levels" });
    }
    
    return res.status(200).json({ 
      message: "Jobs filtered by experience levels successfully",
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

export const filterJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location, experienceLevel, companyId, minSalary, maxSalary } = req.body;
    
    // Initialize query object
    const query: any = {};
    
    // Add location filter if provided
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    // Add experience level filter if provided
    if (experienceLevel) {
      // Check if experienceLevel is an array
      if (Array.isArray(experienceLevel) && experienceLevel.length > 0) {
        query.experience_level = { $in: experienceLevel };
      } else if (typeof experienceLevel === 'string') {
        query.experience_level = experienceLevel;
      }
    }
    
    // Add company filter if provided
    if (companyId) {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ message: "Invalid company ID format" });
      }
      query.organization_id = companyId;
    }
    
    // Add salary range filter if provided
    if (minSalary !== undefined || maxSalary !== undefined) {
      query.salary = {};
      
      if (minSalary !== undefined) {
        const min = Number(minSalary);
        if (isNaN(min)) {
          return res.status(400).json({ message: "Minimum salary must be numeric" });
        }
        query.salary.$gte = min;
      }
      
      if (maxSalary !== undefined) {
        const max = Number(maxSalary);
        if (isNaN(max)) {
          return res.status(400).json({ message: "Maximum salary must be numeric" });
        }
        query.salary.$lte = max;
      }
      
      // Check if min is greater than max
      if (query.salary.$gte !== undefined && query.salary.$lte !== undefined &&
          query.salary.$gte > query.salary.$lte) {
        return res.status(400).json({ message: "Minimum salary cannot be greater than maximum salary" });
      }
    }
    
    // Check if any filters were provided
    if (Object.keys(query).length === 0) {
      return res.status(400).json({ message: "At least one filter must be provided" });
    }
    
    const filteredJobs = await jobs.find(query).populate({
      model: organizations,
      path: 'organization_id',
    });
    
    if (filteredJobs.length === 0) {
      return res.status(404).json({ message: "No jobs found matching the provided filters" });
    }
    
    return res.status(200).json({ 
      message: "Jobs filtered successfully",
      count: filteredJobs.length,
      data: filteredJobs 
    });
  } catch (error) {
    next(error);
  }
};
