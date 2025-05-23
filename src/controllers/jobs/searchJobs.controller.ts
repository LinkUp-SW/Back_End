import { NextFunction, Request, Response } from "express";
import { paginatedJobQuery, getTimeAgoStage } from "../../utils/database.helper.ts";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import organizations from "../../models/organizations.model.ts";

/**
 * Search for jobs using a single query term
 * Searches across job title, description, skills, responsibilities, qualifications, and industry
 * Excludes jobs from companies that have blocked the user
 */
export const searchJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;
        
        // Get query parameters
        const query = req.query.query as string;
        const cursor = req.query.cursor as string || null;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        
        // Check if query parameter is provided
        if (!query) {
            return res.status(400).json({ message: "Please provide a search query" });
        }

        // Find companies that have blocked this user
        const blockingOrganizations = await organizations.find({
            blocked: user._id
        }).select('_id');
        
        const blockingOrgIds = blockingOrganizations.map(org => org._id?.toString());
        
        // Build search query - search across all relevant fields
        const searchQuery: any = {
            $and: [
                {
                    $or: [
                        { job_title: { $regex: query, $options: 'i' } },
                        { description: { $regex: query, $options: 'i' } },
                        { targetted_skills: { $regex: query, $options: 'i' } },
                        { responsibilities: { $regex: query, $options: 'i' } },
                        { qualifications: { $regex: query, $options: 'i' } },
                        { organization_industry: { $regex: query, $options: 'i' } },
                        { location: { $regex: query, $options: 'i' } },
                    ]
                }
            ]
        };
        
        // Only add the organization filter if there are blocking organizations
        if (blockingOrgIds.length > 0) {
            searchQuery.$and.push({
                organization_id: { $nin: blockingOrgIds }
            });
        }
        
        // Use the helper function with enhanced projection for jobs
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
                        logo: '$org.logo',
                        industry: '$org.industry',
                        size: '$org.size',
                        description: '$org.description',
                        followers_count: { $size: { $ifNull: ['$org.followers', []] } }
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
        
        // Add isSaved status to each job if user is authenticated
        if (user && user.saved_jobs && result.data) {
            const savedJobIds = user.saved_jobs.map(id => id.toString());
            
            result.data = result.data.map(job => ({
                ...job,
                is_saved: savedJobIds.includes(job._id.toString())
            }));
        } else if (result.data) {
            // Set is_saved to false for all jobs if user is not authenticated
            result.data = result.data.map(job => ({
                ...job,
                is_saved: false
            }));
        }
        
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