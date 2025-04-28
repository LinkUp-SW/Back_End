import { Request, Response } from 'express';
import { findUserByUserId, validateUserIdFromRequest } from '../../utils/database.helper.ts';
import { getSavedPostsCursorBased, PostRepository } from '../../repositories/posts.repository.ts';
import { postsInterface } from '../../models/posts.model.ts';
import { validateTokenAndUser } from '../../utils/helperFunctions.utils.ts';
import { handleProfileAccess } from '../../repositories/user.repository.ts';


const displayUserPosts = async (req: Request, res: Response): Promise<Response | void> =>{
    try {
        const cursor = parseInt(req.query.cursor as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        if (!limit ){
            return res.status(400).json({message:'Required fields missing' })
        }
        const result = await validateTokenAndUser(req, res);
        if (!result) return;
    
        const { viewerId, targetUser } = result;
    
        // Retrieve the viewer's user document
        const viewerUser = await findUserByUserId(viewerId, res);
        if (!viewerUser) return;
    
        const is_me = viewerUser.user_id.toString() === targetUser.user_id.toString();
        const hasAccess = await handleProfileAccess(viewerId.toString(), targetUser.user_id.toString(), res);
            if (!hasAccess) return;
        const displayedUserPosts = [...targetUser.activity.posts].reverse().map((post: postsInterface) => post._id);
        const { posts: postsData, nextCursor } = await getSavedPostsCursorBased(displayedUserPosts as string[], cursor, limit);
        let filteredPosts = is_me ? postsData : postsData.filter(post => post.public_post === true);
        
        return res.status(200).json({message:'Posts returned successfully',is_me,posts:filteredPosts,nextCursor:nextCursor })
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message,success:false });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
}; 

export{displayUserPosts}