import { NextFunction, Request, Response } from "express";
import jobs from "../../models/jobs.model.ts";
import mongoose from 'mongoose';
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import { paginatedJobQuery, getTimeAgoStage } from "../../utils/database.helper.ts";


/**
 * Get personalized job recommendations for the user
 * Algorithm:
 * - Match user skills with job required skills
 * - Exclude jobs user has already applied to
 * - Exclude jobs from user's current organization
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
        const baseQuery: any = {};

        // Exclude jobs from user's current organization
        if (userOrgIds.length > 0) {
            baseQuery.organization_id = { $nin: userOrgIds };
        }

        // Exclude jobs user has already applied to
        if (appliedJobIds.length > 0) {
            baseQuery._id = { $nin: appliedJobIds };
        }

        // Additional aggregation stages for personalized recommendations
        const extraStages = [
            {
                $addFields: {
                    skillMatchCount: {
                        $size: {
                            $filter: {
                                input: '$targetted_skills',
                                as: 'skill',
                                cond: {
                                    $in: [{ $toLower: '$$skill' }, Array.from(userSkills)]
                                }
                            }
                        }
                    },
                    totalSkills: { $size: '$targetted_skills' },
                    industryMatch: {
                        $cond: [
                            { $in: [userIndustry, '$organization_industry'] },
                            1,
                            0
                        ]
                    }
                }
            },
            {
                $addFields: {
                    matchScore: {
                        $cond: [
                            { $eq: ['$totalSkills', 0] },
                            0,
                            {
                                $add: [
                                    { $divide: ['$skillMatchCount', { $max: [1, '$totalSkills'] }] },
                                    '$industryMatch'
                                ]
                            }
                        ]
                    }
                }
            },
            getTimeAgoStage(), // Use the helper function here
            {
                $project: {
                    _id: 1,
                    job_title: '$job_title',
                    location: 1,
                    workplace_type: 1,
                    salary: 1,
                    experience_level: 1,
                    timeAgo: 1, // Include the calculated timeAgo field
                    'organization_id.name': '$organization.organization_name',
                    'organization_id.logo': '$organization.logo',
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

        // Use the helper function with standard projection
        const extraStages = [
            getTimeAgoStage(), // Use the helper function here
            {
                $project: {
                    _id: 1,
                    job_title: 1,
                    location: 1,
                    workplace_type: 1,
                    salary: 1,
                    experience_level: 1,
                    timeAgo: 1, // Include the calculated timeAgo field
                    'organization_id.name': '$organization.organization_name',
                    'organization_id.logo': '$organization.logo',
                }
            }
        ];

        const result = await paginatedJobQuery({}, cursor, limit, { _id: -1 }, extraStages);

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
