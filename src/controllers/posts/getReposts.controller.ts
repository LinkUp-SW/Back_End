import { Request, Response } from 'express';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { enhancePosts, getPostsFromPostIdsCursorBased, PostRepository } from '../../repositories/posts.repository.ts';
import { postsInterface, postTypeEnum } from '../../models/posts.model.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';



/**
 * Display the reposts on a post
 * Sends the posts in batches and the index to start the next batch from
 * 
 */
export const displayReposts = async (req: Request, res: Response): Promise<Response | void> =>{
    try {
        const postId = req.params.postId;
        const cursor = parseInt(req.query.cursor as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        if (!limit ){
            return res.status(400).json({message:'Required fields missing' })
        }
        let userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        const postsRepository = new PostRepository;
        const post = await postsRepository.findByPostId(postId);
        if (!post){
            return res.status(404).json({message:'Post not found' });
        }
        let repostIds;
        if (post.post_type===postTypeEnum.repost_instant){
            const original_post=await postsRepository.findByPostId(post.media.link[0]);
            if (original_post && original_post.reposts && original_post.reposts.length > 0){
                repostIds=[...original_post.reposts].reverse().map((post: postsInterface) => post._id);
            }
        }else if (post.reposts && post.reposts.length > 0){
            repostIds=[...post.reposts].reverse().map((post: postsInterface) => post._id);
        }
        const connections = user.connections.map(conn => 
            typeof conn === 'object' && conn._id ? conn._id.toString() : conn.toString()
        );

        // Use a higher fetch limit to account for filtering
        // Request more posts than needed (2x limit as a starting point)
        const fetchLimit = limit * 2;
        
        let allFilteredPosts: any[] = [];
        let currentCursor = cursor;
        let hasMorePosts = true;
        let nextCursor = null;

        // Keep fetching posts until we have enough or run out
        while (allFilteredPosts.length < limit && hasMorePosts) {
            const { posts: postsData, next_cursor } = await getPostsFromPostIdsCursorBased(
                repostIds as string[], 
                currentCursor, 
                fetchLimit,
            );
            
            // Enhance the fetched posts
            const enhancedPosts = await enhancePosts(postsData, user._id!.toString(), user.saved_posts);
            
            // Apply privacy filtering
            const filteredBatch = enhancedPosts.filter(post => {
                const isPublicPost = post.public_post === true;
                const isFromConnection = connections.includes(post.user_id.toString());
                const isOwnPost = post.user_id.toString() === user._id!.toString();
                
                return isPublicPost || isFromConnection || isOwnPost;
            });
            
            // Add filtered posts to our collection
            allFilteredPosts = [...allFilteredPosts, ...filteredBatch];
            
            // Update cursor and check if more posts are available
            if (next_cursor !== null && postsData.length > 0) {
                currentCursor = next_cursor;
                nextCursor = next_cursor;
            } else {
                hasMorePosts = false;
            }
            
            // Avoid infinite loop if no more posts match criteria
            if (postsData.length === 0) {
                hasMorePosts = false;
            }
        }
        
        // Trim to the requested limit
        const finalPosts = allFilteredPosts.slice(0, limit);
        
        // Only return next_cursor if we have more matching posts
        const returnNextCursor = hasMorePosts && finalPosts.length === limit ? nextCursor : null;
        return res.status(200).json({message:'Posts returned successfully',posts:finalPosts,next_cursor:returnNextCursor })
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message,success:false });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
}; 
