import { NextFunction, Request, Response } from "express";
import mongoose from 'mongoose';
import { paginatedJobQuery, getTimeAgoStage } from "../../utils/database.helper.ts";

/**
 * Search for jobs using a single query term
 * Searches across job title, description, skills, responsibilities, qualifications, and industry
 */
export const searchJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get query parameters
        const query = req.query.query as string;
        const cursor = req.query.cursor as string || null;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        
        // Check if query parameter is provided
        if (!query) {
            return res.status(400).json({ message: "Please provide a search query" });
        }
        
        // Build search query - search across all relevant fields
        const searchQuery = {
            $or: [
                { job_title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { targetted_skills: { $regex: query, $options: 'i' } },
                { responsibilities: { $regex: query, $options: 'i' } },
                { qualifications: { $regex: query, $options: 'i' } },
                { organization_industry: { $regex: query, $options: 'i' } }
            ]
        };
        
        // Use the helper function with standard projection for jobs
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
        
        // Execute the search query with pagination
        const result = await paginatedJobQuery(
            searchQuery,
            cursor,
            limit,
            { _id: -1 }, // Sort by newest first
            extraStages
        );
        
        // Return search results
        return res.status(200).json({
            message: "Job search results",
            query: query,
            count: result.count,
            total: result.total,
            data: result.data,
            nextCursor: result.nextCursor
        });
    } catch (error) {
        console.error("Error searching jobs:", error);
        next(error);
    }
};