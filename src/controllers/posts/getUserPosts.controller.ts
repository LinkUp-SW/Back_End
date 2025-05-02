import { Request, Response } from 'express';
import { findUserByUserId} from '../../utils/database.helper.ts';
import { enhancePosts, getSavedPostsCursorBased} from '../../repositories/posts.repository.ts';
import { postsInterface } from '../../models/posts.model.ts';
import { validateTokenAndUser } from '../../utils/helperFunctions.utils.ts';
import { handleProfileAccess } from '../../repositories/user.repository.ts';
import { ConnectionRequest } from '../../models/users.model.ts';

const displayUserPosts = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const cursor = parseInt(req.query.cursor as string) || 0;
        let limit = parseInt(req.query.limit as string) || 10;
        if (!limit) {
            return res.status(400).json({message: 'Required fields missing'});
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
        
        // Check if filtering will be needed
        const connections = viewerUser.connections.map((connection: ConnectionRequest) => connection._id.toString());
        const isFromConnection = connections.includes(targetUser._id.toString());
        const willNeedFiltering = !is_me && !isFromConnection;
        
        // If filtering will be needed, increase the fetch limit to compensate
        const fetchLimit = willNeedFiltering ? limit * 2 : limit; // Fetch more if we'll filter
        
        // Fetch posts with the potentially increased limit
        const displayedUserPosts = [...targetUser.activity.posts].reverse().map((post: postsInterface) => post._id);
        const { posts: initialPostsData, next_cursor: initialnext_cursor } = 
            await getSavedPostsCursorBased(displayedUserPosts as string[], cursor, fetchLimit,viewerUser._id as string);
        
        // Apply filtering if needed
        let filteredPosts = initialPostsData;
        if (!isFromConnection && !is_me) {
            filteredPosts = initialPostsData.filter(post => post.public_post === true);
        }
        
        // If we have fewer posts than requested after filtering, fetch more
        let finalPosts = filteredPosts;
        let next_cursor = initialnext_cursor;
        
        // Only fetch more if we filtered out posts and have fewer than requested
        if (filteredPosts.length < limit && filteredPosts.length < initialPostsData.length && initialnext_cursor) {
            // Continue fetching additional batches until we have enough or run out of posts
            let currentCursor: number | null = initialnext_cursor;
            while (finalPosts.length < limit && currentCursor) {
                const { posts: additionalPosts, next_cursor: newCursor } = 
                    await getSavedPostsCursorBased(displayedUserPosts as string[], currentCursor, limit,viewerUser._id as string);
                
                // Filter the additional posts
                const filteredAdditionalPosts = !isFromConnection && !is_me ? 
                    additionalPosts.filter(post => post.public_post === true) : additionalPosts;
                
                // Add the new posts to our collection
                finalPosts = [...finalPosts, ...filteredAdditionalPosts];
                
                // Update the cursor for next iteration
                currentCursor = newCursor;
                next_cursor = newCursor;
                
                // Break if no more posts are available
                if (!additionalPosts.length || !newCursor) break;
            }
            
            // Trim to the requested limit
            finalPosts = finalPosts.slice(0, limit);
        }

        // Enhance posts with reactions data before returning
        const enhancedPosts = await enhancePosts(
            finalPosts,
            viewerUser._id!.toString(), 
            viewerUser.savedPosts
        );
        return res.status(200).json({
            message: 'Posts returned successfully',
            is_me,
            posts: enhancedPosts,
            next_cursor: next_cursor
        });
    } catch (error) {
        // Error handling unchanged
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message, success: false });
        } else {
            return res.status(500).json({ message: 'Server error', error });
        }
    }
};

export{displayUserPosts}