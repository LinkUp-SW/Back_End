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
 * @route GET /api/v1/posts/search
 * @param {string} q - Search query text
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
    const query = req.query.q as string;
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
    
    // Escape special regex characters in the query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Extract viewer's connection IDs
    const connectionIds = user.connections.map((connection: ConnectionRequest) => 
      connection._id.toString()
    );
    
    // Define the base aggregation pipeline
    const basePipeline: PipelineStage[] = [
      // Match posts with content containing the search query
      {
        $match: {
          content: { $regex: escapedQuery, $options: 'i' },
          ...(cursor ? { date: { $lt: cursor } } : {}),
        }
      },
      // Add user details for privacy checking
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      // Match based on privacy settings
      {
        $match: {
          $or: [
            { public_post: true }, // Public posts
            { user_id: user._id }, // User's own posts
            { user_id: { $in: connectionIds.map(id => new mongoose.Types.ObjectId(id)) } } // Posts from connections
          ]
        }
      },
      // Project only needed fields
      {
        $project: {
          _id: 1,
          user_id: 1,
          content: 1,
          date: 1,
          media: 1,
          comments_disabled: 1,
          public_post: 1,
          reacts: 1,
          tagged_users: 1,
          comments: 1,
          is_edited: 1,
          post_type: 1,
          reposts: 1
        }
      },
      // Sort by date (most recent first)
      { $sort: { date: -1 } },
      // Limit results
      { $limit: limit + 1 } // Fetch one extra to determine if there are more posts
    ];
    
    // Execute the aggregation
    const postsData = await posts.aggregate(basePipeline);
    
    // Check if there are more posts
    const hasMorePosts = postsData.length > limit;
    const resultPosts = hasMorePosts ? postsData.slice(0, limit) : postsData;
    
    // Get user's saved posts for the enhancePosts function
    const userSavedPosts = user.savedPosts || [];
    
    // Enhance posts with metadata (reactions, author info, etc.)
    const enhancedPosts = await enhancePosts(
      resultPosts,
      (user._id as mongoose.Types.ObjectId).toString(),
      userSavedPosts
    );
    
    // Calculate next cursor
    const nextCursor = hasMorePosts && resultPosts.length > 0
      ? resultPosts[resultPosts.length - 1].date
      : null;
    
    return res.status(200).json({
      message: 'Posts retrieved successfully',
      posts: enhancedPosts,
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