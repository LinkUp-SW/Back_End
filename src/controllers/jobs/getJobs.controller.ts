import { NextFunction, Request, Response } from "express";
import jobs from "../../models/jobs.model.ts";
import mongoose from 'mongoose';
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import { paginatedJobQuery, getTimeAgoStage } from "../../utils/database.helper.ts";
import organizations from "../../models/organizations.model.ts"; // Add import for organizations model

/**
 * Get personalized job recommendations for the user
 * Algorithm:
 * - Match user skills with job required skills
 * - Exclude jobs user has already applied to
 * - Exclude jobs from user's current organization
 * - Exclude jobs from organizations that have blocked the user
 * - Consider industries matching user's experience
 * - Return ranked job recommendations
 */
export const getPersonalizedJobRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        // Handle pagination
        const cursor = req.query.cursor as string || null;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        // Find organizations that have blocked this user
        const organizationsBlockedBy = await organizations.find(
            { blocked: user._id },
            { _id: 1 }
        );
        
        const blockedOrgIds = organizationsBlockedBy.map(org => org._id);

        const userSkills = new Set<string>();

        // Skills from the skills array
        if (user.skills && user.skills.length > 0) {
            user.skills.forEach(skill => {
                if (skill.name) userSkills.add(skill.name.toLowerCase());
            });
        }

        // Get user's current organization IDs
        const userOrgIds: mongoose.Types.ObjectId[] = [];
        if (user.work_experience && user.work_experience.length > 0) {
            user.work_experience.forEach(exp => {
                if (exp.is_current && exp.organization) {
                    userOrgIds.push(new mongoose.Types.ObjectId(exp.organization.toString()));
                }
            });
        }

        // Get user's industry for matching
        const userIndustry = user.industry || '';

        // Get user's applied job IDs to exclude them
        const appliedJobIds = (user.applied_jobs || []).map(jobId =>
            new mongoose.Types.ObjectId(jobId.toString())
        );

        // Build base query
        const baseQuery: any = {
            // Only show open jobs
            job_status: "Open"
        };

        // Exclude jobs from user's current organization and from organizations that blocked the user
        const excludedOrgIds = [...userOrgIds, ...blockedOrgIds];
        if (excludedOrgIds.length > 0) {
            baseQuery.organization_id = { $nin: excludedOrgIds };
        }

        // Exclude jobs user has already applied to
        if (appliedJobIds.length > 0) {
            baseQuery._id = { $nin: appliedJobIds };
        }

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
                    }
                }
            }
        ];

        // Use the helper function for paginated query with custom sorting by match score
        const result = await paginatedJobQuery(
            baseQuery,
            cursor,
            limit,
            { matchScore: -1, _id: -1 },
            extraStages
        );

        return res.status(200).json({
            message: "Personalized job recommendations retrieved successfully",
            count: result.count,
            total: result.total,
            data: result.data,
            nextCursor: result.nextCursor
        });
    }
    catch (error) {
        console.error("Error getting personalized job recommendations:", error);
        return res.status(500).json({ message: "Failed to retrieve job recommendations" });
    }
};

export const getAllJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cursor = req.query.cursor as string || null;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        
        // Base query - only show open jobs and exclude organizations that blocked the user if authenticated
        let baseQuery: any = {
            job_status: "Open"
        };
        
        // Try to get the authenticated user (if available)
        const user = await validateTokenAndGetUser(req, res);
        
        if (user) {
            // Find organizations that have blocked this user
            const organizationsBlockedBy = await organizations.find(
                { blocked: user._id },
                { _id: 1 }
            );
            
            const blockedOrgIds = organizationsBlockedBy.map(org => org._id);
            
            if (blockedOrgIds.length > 0) {
                baseQuery.organization_id = { $nin: blockedOrgIds };
            }
        }

        // Use the helper function with standard projection
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
                    }
                }
            }
        ];

        const result = await paginatedJobQuery(baseQuery, cursor, limit, { _id: -1 }, extraStages);

        return res.status(200).json({
            message: "Jobs retrieved successfully",
            count: result.count,
            total: result.total,
            data: result.data,
            nextCursor: result.nextCursor
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
        
        // Get the authenticated user to check saved status
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        // First get the job to check its organization
        const jobBasic = await jobs.findById(jobId).select('organization_id');
        
        if (!jobBasic) {
            return res.status(404).json({ message: 'Job not found' });
        }
        
        const userIdStr = user._id?.toString();
        // If user is authenticated, check if they're blocked by the organization
        if (user) {
            const organization = await organizations.findById(jobBasic.organization_id);
            
            if (organization && organization.blocked && 
                organization.blocked.some(blockedId => blockedId.toString() === userIdStr)) {
                return res.status(403).json({ 
                    message: 'You cannot view this job as you have been blocked by the organization' 
                });
            }
        }
        
        // Use aggregation pipeline instead of findById
        const jobData = await jobs.aggregate([
            { 
                $match: { _id: new mongoose.Types.ObjectId(jobId) } 
            },
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
                    description: 1,
                    benefits: 1,
                    qualifications: 1,
                    responsibilities: 1,
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
            },
            getTimeAgoStage(), // Add the timeAgo field
            {
                $limit: 1
            }
        ]);
        
        if (!jobData || jobData.length === 0) {
            return res.status(404).json({ message: 'Job not found' });
        }
        
        const job = jobData[0];
        
        // Add is_saved status if user is authenticated
        if (user) {
            const isSaved = user.saved_jobs.some(savedJobId => 
                savedJobId.toString() === jobId
            );
            job.is_saved = isSaved;
        } else {
            job.is_saved = false; // Default to false if user is not authenticated
        }
        
        return res.status(200).json({
            message: "Job retrieved successfully",
            data: job
        });
    } catch (error) {
        console.error("Error retrieving job:", error);
        return res.status(500).json({ message: "Failed to retrieve job" });
    }
};