import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../../middleware/asyncHandler.ts';
import {getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { reportRepo, ReportRepository } from '../../repositories/report.repository.ts';
import { adminActionEnum, contentTypeEnum, reportStatusEnum } from '../../models/reports.model.ts';
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

        // Get content reference and type
        const { contentRef, contentType } = req.params;
        
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
        
        // Get content reports summary
        const reportSummary = await reportRepository.getContentReports(
            contentRef,
            contentType as contentTypeEnum
        );
        
        // Fetch the content info based on type
        let contentInfo = null;
        let parentPostInfo = null;
        try {
            switch (contentType) {
                case contentTypeEnum.Post:
                    const post = await postRepository.findByPostId(contentRef);
                    if (post) {
                        contentInfo = await enhancePost(post, user._id!.toString());
                        contentInfo={
                            ...contentInfo,
                            type:'Post',
                        }
                    }
                    break;
                case contentTypeEnum.Comment:
                    const comment = await commentRepository.findById(contentRef);
                    if (comment) {
                        const author = await getFormattedAuthor(comment.user_id.toString());
                        // Find the post this comment belongs to
                        const parentPost = await postRepository.findByPostId(comment.post_id.toString());
                        
                        if (parentPost) {
                            parentPostInfo = await enhancePost(parentPost, user._id!.toString());
                        }
                        
                        contentInfo = {
                            _id: comment._id,
                            type: 'Comment',
                            content: comment.content || 'No text',
                            author,
                            media:{
                                link:comment.media,
                                media_type: comment.media ? "image" : "none",
                                
                            },
                            date:comment.date 
                        };
                    }
                    break;
                case contentTypeEnum.Job:
                    const job = await jobs.findById(contentRef);
                    if (job) {
                        const organization = await organizations.findById(job.organization_id);
                        if (organization) {
                            contentInfo = {
                                _id: job._id,
                                type: 'Job',
                                title: job.job_title || 'No title',
                                description: job.description?.substring(0, 200) + (job.description?.length > 200 ? '...' : ''),
                                qualifications:job.qualifications,
                                responsibilities:job.responsibilities,
                                benefits:job.benefits,
                                organization: {
                                    _id: organization._id,
                                    name: organization.name,
                                    logo: organization.logo
                                }
                            };
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error("Error fetching content info:", error);
            // Continue without content info if there's an error
            contentInfo = { error: "Error fetching content details" };
        }
        
        return res.status(200).json({
            message: 'Content reports retrieved successfully',
            success: true,
            data: {
                content: contentInfo,
                parent_post: parentPostInfo!,
                total_count: reportSummary.totalCount,
                reasons_summary: reportSummary.reasonsSummary
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


export const resolveReport = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try{
        let userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;


        const { contentRef, contentType } = req.params;
        
        if(!contentRef ||!contentType){
            return res.status(400).json({ message: 'Required fields missing' });
        }
        if (!Object.values(contentTypeEnum).includes(contentType as contentTypeEnum)) {
            return res.status(400).json({
                message: 'Invalid content type',
                success: false
            });
        }
        let adminAction = adminActionEnum.dismissed;;
        
        // Method 1: Check the request method
        if (req.method === 'DELETE') {
            adminAction = adminActionEnum.content_removed;
        }
        const reports = await reportRepository.findReportsForContent(contentRef,contentType)
        if (reports.length === 0) {
            return res.status(404).json({ 
                message: 'No reports found for this content',
                success: false
            });
        }
        
        // Check if reports are already resolved
        if (reports[0].status === reportStatusEnum.resolved) {
            return res.status(400).json({ 
                message: 'Reports already resolved',
                success: false
            });
        }
        const result = await reportRepository.resolveContentReports(contentRef,contentType,user._id as string,adminAction)     
        return res.status(200).json({ 
            message: 'Reports resolved successfully',
            success: true,
            data: {
                resolved_count: result.modifiedCount,
                admin_action: adminAction
            }
    });
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
 