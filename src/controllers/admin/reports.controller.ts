import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../../middleware/asyncHandler.ts';
import {getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { ReportRepository } from '../../repositories/report.repository.ts';
import { contentTypeEnum, reportStatusEnum } from '../../models/reports.model.ts';
import { enhancePost, PostRepository } from '../../repositories/posts.repository.ts';
import { CommentRepository } from '../../repositories/comment.repository.ts';
import jobs from '../../models/jobs.model.ts';
import { getFormattedAuthor } from '../../repositories/user.repository.ts';
import organizations from '../../models/organizations.model.ts';

const reportRepository = new ReportRepository;
const postRepository = new PostRepository;
const commentRepository = new CommentRepository;
export const createReport = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
   try{
    let userId = await getUserIdFromToken(req,res);
    if (!userId) return;
    const user = await findUserByUserId(userId,res);
    if (!user) return;

    const{
        contentRef,
        contentType,
        reason

    }=req.body;

    if(!contentRef ||!contentType ||!reason ){
        return res.status(400).json({ message: 'Required fields missing' });
    }
    switch(contentType){
        case contentTypeEnum.Post:
            const post = await postRepository.findByPostId(contentRef);
            if (!post){
                return res.status(404).json({message:'Post does not exist ' })
            }
            break;
        case contentTypeEnum.Comment:
            const comment = await commentRepository.findById(contentRef);
            if(!comment){
                return res.status(404).json({ message: 'Comment does not exist' });
            }
            break;
        case contentTypeEnum.Job:
            const job = await jobs.findById(contentRef);
            if(!job){
                return res.status(404).json({ message: 'job does not exist' });
            }
            break;
        default:
            return res.status(400).json({ message: 'Wrong type entered, choose from the following: Post,Comment,Job' });
    }
    const userReported = await reportRepository.findExistingReport(user._id as string,contentRef,contentType);
    if (userReported){
        return res.status(400).json({ message: 'User already reported this' });
    }
    const report = await reportRepository.createReport(
        user._id as string,
        contentRef,
        contentType,
        reason
    )    
    
    return res.status(201).json({ message: 'report created successfully',report:report._id});
}catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
        return res.status(401).json({ message: error.message,success:false });
    }
    else{
        res.status(500).json({ message: 'Server error', error });

    }
}

}
);

export const getReports = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        // Authenticate the user as admin (you may want to add admin check middleware)
        let userId = await getUserIdFromToken(req, res);
        if (!userId) return;
        
        const user = await findUserByUserId(userId, res);
        if (!user) return;
        
        // Check if user is admin (adjust according to your admin logic)
        if (!user.is_admin) {
            return res.status(403).json({ 
                message: 'Access denied. Admin privileges required',
                success: false 
            });
        }

        // Get pagination and filter parameters
        const { status, cursor, limit } = req.query;
        
        // Parse parameters
        const parsedStatus = status ? status.toString() as reportStatusEnum : undefined;
        const parsedCursor = cursor ? parseInt(cursor.toString()) : null;
        const parsedLimit = limit ? parseInt(limit.toString()) : 10;
        
        // Validate limit
        if (parsedLimit > 50) {
            return res.status(400).json({ 
                message: 'Limit cannot exceed 50 reports per request',
                success: false 
            });
        }

        // Get paginated reports
        const result = await reportRepository.getPaginatedReports(
            parsedStatus,
            parsedCursor,
            parsedLimit
        );

        return res.status(200).json({
            message: 'Reports retrieved successfully',
            success: true,
            data: {
                reports: result.reports,
                total_count: result.totalCount,
                status_counts: result.statusCounts,
                next_cursor: result.nextCursor
            }
        });
        
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message, success: false });
        } else {
            return res.status(500).json({ 
                message: 'Server error fetching reports', 
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error' 
            });
        }
    }
});

/**
 * Get paginated reports for a specific content item
 */
export const getContentReports = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        // Authenticate the user as admin
        let userId = await getUserIdFromToken(req, res);
        if (!userId) return;
        
        const user = await findUserByUserId(userId, res);
        if (!user) return;
        
        // Check if user is admin
        if (!user.is_admin) {
            return res.status(403).json({ 
                message: 'Access denied. Admin privileges required',
                success: false 
            });
        }

        // Get content reference, type, and pagination parameters
        const { contentRef, contentType } = req.params;
        const { cursor, limit } = req.query;
        
        // Validate required parameters
        if (!contentRef || !contentType) {
            return res.status(400).json({
                message: 'Content reference and type are required',
                success: false
            });
        }
        
        // Validate content type
        if (!Object.values(contentTypeEnum).includes(contentType as contentTypeEnum)) {
            return res.status(400).json({
                message: 'Invalid content type',
                success: false
            });
        }
        
        // Parse pagination parameters
        const parsedCursor = cursor ? parseInt(cursor.toString()) : null;
        const parsedLimit = limit ? parseInt(limit.toString()) : 10;
        
        // Validate limit
        if (parsedLimit > 50) {
            return res.status(400).json({
                message: 'Limit cannot exceed 50 reports per request',
                success: false
            });
        }
        
        // Get content reports
        const result = await reportRepository.getContentReports(
            contentRef,
            contentType as contentTypeEnum,
            parsedCursor,
            parsedLimit
        );
        
        // Also fetch the content info based on type
        let contentInfo = null;
        switch (contentType) {
            case contentTypeEnum.Post:
                const post = await postRepository.findByPostId(contentRef);
                if (post) {
                    contentInfo= enhancePost(post,user._id!.toString());
                }
                break;
            case contentTypeEnum.Comment:
                const comment = await commentRepository.findById(contentRef);
                if (comment) {
                    contentInfo = {
                        type: 'comment',
                        content: comment.content || 'No text',
                        author: getFormattedAuthor(comment._id!.toString()),
                        media:comment.media
                    };
                }
                break;
            case contentTypeEnum.Job:
                const job = await jobs.findById(contentRef);
                if (job) {
                    const organization = await organizations.findById(job.organization_id);
                    if (organization){
                    contentInfo = {
                        type: 'job',
                        title: job.job_title || 'No title',
                        organization:{
                            name:organization.name,
                            logo:organization.logo
                        }
                    };
                }
                }
                break;
        }
        
        return res.status(200).json({
            message: 'Content reports retrieved successfully',
            success: true,
            data: {
                content: contentInfo,
                reports: result.reports,
                total_count: result.totalCount,
                next_cursor: result.nextCursor
            }
        });
        
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message, success: false });
        } else {
            return res.status(500).json({
                message: 'Server error fetching content reports',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
});