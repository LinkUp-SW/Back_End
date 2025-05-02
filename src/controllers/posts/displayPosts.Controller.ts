import { Request, Response } from 'express';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { getPostsCursorBased, PostRepository } from '../../repositories/posts.repository.ts';
import { postsInterface } from '../../models/posts.model.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import {ConnectionRequest} from '../../models/users.model.ts';


/**
 * Display posts for the feed
 * Sends the posts in batches and the index to start the next batch from
 * 
 */
const displayPosts = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const cursor = parseInt(req.query.cursor as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        if (!limit ){
            return res.status(400).json({message:'Required fields missing' })
        }
        let userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        const connections = user.connections.map((connection: ConnectionRequest) => connection._id.toString());
        const following = user.following.map(followId => followId.toString());
        const { posts: postsData, next_cursor } = await getPostsCursorBased(user._id as string,connections,following, cursor, limit);

        return res.status(200).json({message:'Posts returned successfully',posts:postsData,next_cursor:next_cursor })
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message,success:false });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
}; 

export {displayPosts};