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
        const { posts: postsData, next_cursor } = await getPostsFromPostIdsCursorBased(repostIds as string[], cursor, limit,user._id as string);
        const enhancedPosts = await enhancePosts(postsData, user._id!.toString(), user.savedPosts);
        return res.status(200).json({message:'Posts returned successfully',posts:enhancedPosts,next_cursor:next_cursor })
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message,success:false });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
}; 
