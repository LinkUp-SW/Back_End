import { Request, Response } from 'express';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { processPostMediaArray } from '../../services/cloudinary.service.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import comments from '../../models/comments.model.ts';
import { PostRepository } from '../../repositories/posts.repository.ts';
import posts, { commentsEnum, postTypeEnum } from '../../models/posts.model.ts';
import mongoose from 'mongoose';
import users from '../../models/users.model.ts';
import { CommentRepository, getAllCommentChildrenIds, getComments, getReplies } from '../../repositories/comment.repository.ts';
import { convert_idIntoUser_id, convertUser_idInto_id } from '../../repositories/user.repository.ts';
import { deleteCommentReactions } from '../../repositories/reacts.repository.ts';
import { contentTypeEnum, Report } from '../../models/reports.model.ts';

/**
 * Create new comment under a post
 * Sends the appropriate response if post was created successfully.
 * 
 */


const createComment = async (req: Request, res: Response): Promise<Response | void> =>{
    try {
        const post_id =req.params.postId;
        const {
            parent_id,
            content,
            media,
            tagged_users
        } =req.body;
        let userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        if ( (!content && !media) || !post_id){
            return res.status(400).json({message:'Required fields missing' })
        }
        const postRepository = new PostRepository;
        let post = await postRepository.findByPostId(post_id);
        if (!post) {
            return res.status(404).json({ message: 'Post does not exist' });
        }
        if (post.post_type===postTypeEnum.repost_instant){
            const orignalPost = await postRepository.findByPostId(post.media.link[0]);
            if (orignalPost) post=orignalPost;
            else return res.status(404).json({ message: 'Original post does not exist' });
        }
        if (post.comments_disabled == commentsEnum.connections_only){
            if ((!Array.isArray(user.connections) || 
                !user.connections.some(connection => 
                    connection._id && new mongoose.Types.ObjectId(connection._id.toString()).equals(post.user_id)))&& post.user_id !==user._id) {
                return res.status(403).json({ message: 'You are not allowed to comment on this post' });
            }
        }
        else if(post.comments_disabled == commentsEnum.noone){
            return res.status(403).json({ message: 'You are not allowed to comment on this post' });
        }
        let processedMedia: string[] | null = null;
        if (media && (!Array.isArray(media) || media.length > 0)) {
            processedMedia = await processPostMediaArray(media);
        }
        const firstMedia = processedMedia && processedMedia.length > 0 ? processedMedia[0] : null;
        if (parent_id !== null) {
            const parentComment = await comments.findById(parent_id);
            if (!parentComment) {
                return res.status(404).json({ message: 'Parent comment not found' });
            }
            if (!post.comments || !post.comments.some(comment => (comment._id as mongoose.Types.ObjectId).toString() === parent_id)) {
                return res.status(404).json({ message: 'Comment not found' });
            }
            if (parentComment.parentId) {
                return res.status(400).json({ 
                    message: 'Cannot reply to a reply. Only one level of replies is allowed.' //check with FE and CP 
                });
            }
        }
        let converted_id;
        if (tagged_users)
        { converted_id = await convertUser_idInto_id(tagged_users);}
        const commentRepository= new CommentRepository;
        const result = await commentRepository.create(
            user,
            post_id,
            content,
            parent_id,
            firstMedia,
            converted_id
        )
        const commentDoc = await result.comment;
        await commentDoc.save();
        user.activity.comments.push(commentDoc);
        await user.save();
        post.comments.push(commentDoc);
        await post.save();
        const plainComment = commentDoc.toObject ? commentDoc.toObject() : commentDoc;
        if (plainComment.tagged_users && plainComment.tagged_users.length > 0) {
            const userIds = await convert_idIntoUser_id(plainComment.tagged_users);
            if (userIds) {
                plainComment.tagged_users = userIds;
            }
        }
        return res.status(200).json({message:'comment successfully created', comment:{...plainComment,author:result.author}});
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message,success:false });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
};

const updateComments = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const post_id =req.params.postId;
        const comment_id =req.params.commentId;
        const {
            content,
            media,
            tagged_users
        } = req.body;

        let userId = await getUserIdFromToken(req, res);
        if (!userId) return;
        const user = await findUserByUserId(userId, res);
        if (!user) return;

        if ((!content && !media) || !post_id || !comment_id) {
            return res.status(400).json({ message: 'Required fields missing' });
        }

        const postRepository = new PostRepository;
        let post = await postRepository.findByPostId(post_id);
        if (!post) {
            return res.status(404).json({ message: 'Post does not exist' });
        }

        if (post.post_type===postTypeEnum.repost_instant){
            const orignalPost = await postRepository.findByPostId(post.media.link[0]);
            if (orignalPost) post=orignalPost;
            else return res.status(404).json({ message: 'Original post does not exist' });
        }

        const existingComment = await comments.findById(comment_id);
        if (!existingComment) {
            return res.status(404).json({ message: 'Comment does not exist' });
        }

        if (String(user._id) !== String(existingComment.user_id)) {
            return res.status(401).json({ message: 'Not authorized to update this comment' });
        }

        let processedMedia: string | null = null;
        if (media) {
            const preMediaArray = [media];
            const mediaArray = await processPostMediaArray(preMediaArray);
            const filteredMedia = mediaArray ? mediaArray.filter((item): item is string => item !== undefined) : null;
            processedMedia = filteredMedia && filteredMedia.length > 0 ? filteredMedia[0] : null;
        } else if (media !== undefined) processedMedia=media;
        let converted_id;
        if (tagged_users)
        { converted_id = await convertUser_idInto_id(tagged_users);}
       const commentRepository=new CommentRepository;
       const updatedComment = await commentRepository.update(comment_id,content,processedMedia,converted_id);
        
        if (!updatedComment) {
            return res.status(404).json({ message: 'Failed to update comment' });
        }
        if (updatedComment.tagged_users && updatedComment.tagged_users.length > 0) {
            const userIds = await convert_idIntoUser_id(updatedComment.tagged_users);
            if (userIds) {
                updatedComment.tagged_users = userIds;
            }
        }

        return res.status(200).json({ 
            message: 'Comment updated successfully', 
            comment: updatedComment 
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message, success: false });
        } else {
            console.error("Error in updateComments:", error);
            return res.status(500).json({ message: 'Server error', error });
        }
    }
};
const getCommentsController = async (req: Request, res: Response) => {
    try {
        const post_id =req.params.postId;
        const cursor = parseInt(req.query.cursor as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        const replyLimit = req.query.replyLimit !== undefined ? 
            parseInt(req.query.replyLimit as string) : 2;
        let userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        if (!post_id || limit === undefined || replyLimit === undefined) {
            return res.status(400).json({ error: "Required fields missing" });
        }
        const postRepository = new PostRepository();
        let post = await postRepository.findByPostId(post_id);
        if (!post) {
            return res.status(404).json({ message: "Post does not exist" });
        }
        if (post.post_type===postTypeEnum.repost_instant){
            const orignalPost = await postRepository.findByPostId(post.media.link[0]);
            if (orignalPost) post=orignalPost;
            else return res.status(404).json({ message: 'Original post does not exist' });
        }
        // Call the getComments function
        const result = await getComments(cursor, limit, post_id,replyLimit,user._id!.toString());
    
        // Return the result as a JSON response
        res.status(200).json(result);
        } catch (error) {
        console.error("Error in getCommentsController:", error);
        res.status(500).json({ error: "An error occurred while fetching comments" });
        }
    };
    const getRepliesController = async (req: Request, res: Response) => {
        try {
            const post_id =req.params.postId;
            const comment_id =req.params.commentId;
            const cursor = parseInt(req.query.cursor as string) || 0;
            const replyLimit = req.query.replyLimit !== undefined ? 
                parseInt(req.query.replyLimit as string) : 2;
            let userId = await getUserIdFromToken(req,res);
            if (!userId) return;
            const user = await findUserByUserId(userId,res);
            if (!user) return;
            if (!post_id || !comment_id || replyLimit === undefined) {
                return res.status(400).json({ error: "Required fields missing" });
            }
            const postRepository = new PostRepository();
            const post = await postRepository.findByPostId(post_id);
            if (!post) {
                return res.status(404).json({ message: "Post does not exist" });
            }
            // Call the getComments function
            const result = await getReplies(comment_id, cursor,user._id as string, replyLimit);
        
            // Return the result as a JSON response
            res.status(200).json(result);
            } catch (error) {
            console.error("Error in getCommentsController:", error);
            res.status(500).json({ error: "An error occurred while fetching comments" });
            }
        };
    
const deleteComment = async (req: Request, res: Response) => {
    try {
        let post_id =req.params.postId;
        const comment_id =req.params.commentId;
        
        let userId = await getUserIdFromToken(req, res);
        if (!userId) return;
        const user = await findUserByUserId(userId, res);
        if (!user) return;
        
        if (!comment_id || !post_id) {
            return res.status(400).json({ error: "Required parameters are missing" });
        }
        const postRepository = new PostRepository;
        let post = await postRepository.findByPostId(post_id);
        if (!post) {
            return res.status(404).json({ message: 'Post does not exist' });
        }

        if (post.post_type===postTypeEnum.repost_instant){
            const orignalPost = await postRepository.findByPostId(post.media.link[0]);
            if (orignalPost){
                post=orignalPost;
                post_id=orignalPost._id!.toString();
            }
            else return res.status(404).json({ message: 'Original post does not exist' });
        }

        const comment = await comments.findById(comment_id);
        if (!comment) {
            return res.status(404).json({ error: "Comment does not exist" });
        }
        
        if (String(user._id) !== String(comment.user_id)) {
            return res.status(401).json({ error: "Not authorized to delete this comment" });
        }
        
        // Get all direct reply IDs (only one level)
        const replyIds = await getAllCommentChildrenIds(comment_id);
        await deleteCommentReactions(comment_id);
        await posts.updateOne(
            { _id: post_id },
            { $pull: { comments: comment_id } }
        );
        if (replyIds.length > 0) {
            await posts.updateOne(
                { _id: post_id },
                { $pull: { comments:  { $in: replyIds }  } }
            );
        }
        await user.updateOne({ $pull: { 'activity.comments': comment_id } });
        await Report.deleteMany({ 
            content_ref: comment_id,
            content_type: contentTypeEnum.Comment 
        });
        if (replyIds.length > 0) {
            const childComments = await comments.find({ _id: { $in: replyIds } });
            
            // Collect unique user IDs who created the replies
            const replyUserIds = [...new Set(childComments.map(c => c.user_id.toString()))];
            
            // For each user, remove their comments from activity
            for (const replyUserId of replyUserIds) {
                // Get comments by this user that are being deleted
                const userReplyIds = childComments
                    .filter(c => c.user_id.toString() === replyUserId)
                    .map(c => c._id);
                
                // Remove these comments from user's activity
                await users.updateOne(
                    { _id: replyUserId },
                    { $pull: { 'activity.comments': { $in: userReplyIds }  } }
                );
            }
            await Report.deleteMany({
                content_ref: { $in: replyIds },
                content_type: contentTypeEnum.Comment
            });
        }

        await comments.deleteOne({ _id: comment_id });
        
        // Delete all replies if any exist
        if (replyIds.length > 0) {
            await comments.deleteMany({ _id: { $in: replyIds } });
        }
        
        // Update user activity
        
        return res.status(200).json({
            message: "Comment deleted successfully", 
            deletedReplies: replyIds.length
        });
    } catch (error) {
        console.error("Error in deleteComment:", error);
        res.status(500).json({ 
            error: "An error occurred while deleting the comment" 
        });
    }
};
export {createComment,updateComments,getCommentsController,deleteComment,getRepliesController};