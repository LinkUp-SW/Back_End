import { Request, Response } from 'express';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { enhancePost, PostRepository } from '../../repositories/posts.repository.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import { getComments } from '../../repositories/comment.repository.ts';
import { postTypeEnum } from '../../models/posts.model.ts';



const getPost = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const postId = req.params.postId;
        const cursor = parseInt(req.query.cursor as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        const replyLimit = req.query.replyLimit !== undefined ? 
            parseInt(req.query.replyLimit as string) : 2;
        let userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        const postsRepository = new PostRepository();
        const post = await postsRepository.findByPostId(postId);
        if (!post){
            return res.status(404).json({message:'Post not found' });
        }
        const isPublicPost = post.public_post === true;
        const isOwnPost = post.user_id.toString() === user._id!.toString();
        
        // Get connections as string array for comparison
        const connections = user.connections.map(conn => 
            typeof conn === 'object' && conn._id ? conn._id.toString() : conn.toString()
        );
        const isFromConnection = connections.includes(post.user_id.toString());
        
        // If not public and not own post and not from connection, deny access
        if (!isPublicPost && !isOwnPost && !isFromConnection) {
            return res.status(403).json({ 
                message: 'Access denied. This post is only visible to connections.'
            });
        }
        const enhancedPost = await enhancePost(post, user._id!.toString(),user.saved_posts);
        let result;
        if(post.post_type !== postTypeEnum.repost_instant){
            result = await getComments(cursor, limit, postId, replyLimit, user._id as string);

        }else if(post.media.link[0]){
            result = await getComments(cursor, limit, post.media.link[0].toString(), replyLimit, user._id as string);
        }

return res.status(200).json({
    message: 'Post returned successfully',
    post: enhancedPost,
    comments: result
});
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
}; 

export {getPost};