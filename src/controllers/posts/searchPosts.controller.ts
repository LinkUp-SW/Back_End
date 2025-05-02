import { Request, Response } from 'express';
import mongoose, { PipelineStage } from 'mongoose';
import posts from '../../models/posts.model.ts';
import users from '../../models/users.model.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import { enhancePosts } from '../../repositories/posts.repository.ts';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { ConnectionRequest } from '../../models/users.model.ts';

/**
 * Search Posts Controller
 * ----------------------
 * Searches for posts containing specific text content with cursor-based pagination.
 * 
 * @route GET /api/v2/posts/search
 * @param {string} query - Search query text
 * @param {number} cursor - Timestamp cursor for pagination (Unix timestamp)
 * @param {number} limit - Number of posts to return per page
 * 
 * @returns {Object} response
 * @returns {string} response.message - Operation status message
 * @returns {Array} response.posts - Array of posts matching search criteria
 * @returns {number|null} response.next_cursor - Cursor value for the next page of results
 */
export const searchPosts = async (req: Request, res: Response) => {
  try {
    // Get query parameters
    const query = req.query.query as string;
    const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : null;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Validate required parameters
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Get user ID from token
    let userId = await getUserIdFromToken(req, res);
    if (!userId) return;
    
    // Get user data for connection information
    const user = await findUserByUserId(userId, res);
    if (!user) return;
    
    // Extract the viewer's connections for privacy filtering
    const viewerConnections = user.connections?.map((connection: ConnectionRequest) => 
      typeof connection === 'object' && connection._id 
        ? connection._id.toString() 
        : connection.toString()
    ) || [];
    
    // Convert connections to ObjectIds for MongoDB query
    const viewerConnectionsObjectIds = viewerConnections.map(id => 
      new mongoose.Types.ObjectId(id)
    );
    
    // Safely extract user's ObjectId
    const userIdObject = user._id as mongoose.Types.ObjectId;
    const userIdString = userIdObject.toString();
    
    // Escape special regex characters in the query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
  
    // Define the base aggregation pipeline with privacy filtering
    const basePipeline: PipelineStage[] = [
      // Match posts with content containing the search query
      {
        $match: {
          content: { $regex: escapedQuery, $options: 'i' },
          post_type: "Standard",
          $and: [
            {
              // Don't show the viewer's own posts
              $or: [
                { user_id: { $ne: userIdObject } },
                { "user_id": { $ne: userIdString } }
              ]
            },
            {
              // Privacy filtering: Only include posts that are either:
              // 1. Public posts, OR
              // 2. Private posts where the author is connected to the viewer
              $or: [
                { public_post: true },
                { 
                  public_post: false, 
                  user_id: { $in: viewerConnectionsObjectIds } 
                }
              ]
            }
          ],
          ...(cursor ? { date: { $lt: cursor } } : {}),
        }
      },
    ];
    
    // Execute the aggregation and enhance posts
    const postsData = await posts.aggregate(basePipeline);
    
    // Check if there are more posts
    const hasMorePosts = postsData.length > limit;
    const resultPosts = hasMorePosts ? postsData.slice(0, limit) : postsData;
    
    // Enhance posts with metadata
    const enhancedPosts = await enhancePosts(
      resultPosts,
      userIdString,
      user.savedPosts || []
    );

    // Final filter to remove:
    // 1. Posts with connection_degree "me" (current user's posts)
    // 2. Any remaining private posts where connection check failed
    const filteredPosts = enhancedPosts.filter(post => {
      // Don't show the viewer's own posts
      if (post.author?.connection_degree === "me") {
        return false;
      }
    
      // Public posts are always visible
      if (post.public_post === true) {
        return true;
      }
    
      // For private posts, ensure the author is really in connections
      // Need to normalize IDs for comparison
      const postUserId = post.user_id.toString();
      const isConnected = viewerConnections.some(connId => 
        connId.toString() === postUserId
      );
      return isConnected;
    });

    // Calculate next cursor
    const nextCursor = hasMorePosts && filteredPosts.length > 0
      ? resultPosts[resultPosts.length - 1].date
      : null;
    
    return res.status(200).json({
      message: 'Posts retrieved successfully',
      posts: filteredPosts,
      next_cursor: nextCursor
    });
    
  } catch (error) {
    console.error('Error searching posts:', error);
    
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return res.status(401).json({ message: error.message, success: false });
    } else {
      return res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
};
