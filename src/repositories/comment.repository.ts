import mongoose from 'mongoose';
import comments from '../models/comments.model.ts';
import users from '../models/users.model.ts';
import { convert_idIntoUser_id } from './user.repository.ts';
import { deleteCommentReactions, getTopReactions, ReactionRepository } from './reacts.repository.ts';
import { targetTypeEnum } from '../models/reactions.model.ts';

export class CommentRepository {
  /**
   * Creates a new comment
   * @param userId - The ID of the user creating the comment
   * @param postId - The ID of the post being commented on
   * @param content - The content of the comment
   * @param parentId - Optional parent comment ID for replies
   * @param media - Optional media attachment
   * @returns Promise with the created comment
   */
  async create(
    user: any,
    postId: string,
    content: string,
    parentId?: string | null,
    media?: string | null,
    taggedUsers?: mongoose.Types.ObjectId[] | undefined
  ) {
    const comment= comments.create({
      user_id: user._id,
      post_id: postId,
      content: content,
      parentId: parentId || null,
      media: media || null,
      date: new Date(),
      tagged_users:taggedUsers
    });
    const authorInfo = {
        username: user.user_id,
        firstName: user.bio.first_name,
        lastName: user.bio.last_name,
        headline:user.bio.headline,
        profilePicture: user.profile_photo,
        connectionDegree:"3rd+"
    };
    return {comment:comment,author:authorInfo}
  }

  /**
   * Updates an existing comment
   * @param commentId - The ID of the comment to update
   * @param content - New content for the comment
   * @param media - New media attachment
   * @returns Promise with the updated comment
   */
  async update(
    commentId: string,
    content?: string,
    media?: string | null,
    taggedUsers?: mongoose.Types.ObjectId[] | null
  ) {
    const updateFields: Record<string, any> = {};
    if (content !== undefined) updateFields.content = content;
    if (media !== undefined) updateFields.media = media;
    if (taggedUsers !== null) updateFields.tagged_users = taggedUsers;
    // Add isEdited flag when updating
    if (Object.keys(updateFields).length > 0) {
      updateFields.isEdited = true;
    }
    
    return comments.findOneAndUpdate(
      { _id: commentId },
      { $set: updateFields },
      { new: true, upsert: false }
    );
  }

  /**
   * Finds a comment by its ID
   * @param commentId - The ID of the comment to find
   * @returns Promise with the found comment or null
   */
  async findById(commentId: string) {
    return comments.findOne({ _id: commentId });
  }

  /**
   * Finds comments by a specific user
   * @param userId - The ID of the user
   * @param limit - Maximum number of comments to retrieve
   * @param skip - Number of comments to skip
   * @returns Promise with the user's comments
   */
  async findByUserId(userId: string, limit: number = 10, skip: number = 0) {
    return comments.find({ user_id: userId })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
  }

  /**
   * Deletes a comment by ID
   * @param commentId - The ID of the comment to delete
   * @returns Promise with the deletion result
   */
  async delete(commentId: string) {
    return comments.deleteOne({ _id: commentId });
  }

  /**
   * Counts comments for a specific post
   * @param postId - The ID of the post
   * @param parentId - Optional parent comment ID to count only replies
   * @returns Promise with the count of comments
   */
  async countComments(postId: string, parentId?: string | null) {
    const query: Record<string, any> = { post_id: postId };
    
    if (parentId) {
      query.parentId = parentId;
    } else if (parentId === null) {
      query.parentId = null; // Count only root comments
    }
    
    return comments.countDocuments(query);
  }
}


/**
 * Fetches paginated comments for a post with their direct replies
 * @param cursor - The position to start fetching root comments from
 * @param limit - Maximum number of root comments to fetch
 * @param postId - The ID of the post to fetch comments for
 * @param replyLimit - Maximum number of replies to fetch per root comment
 * @returns Promise containing the comments, count, and pagination info
 */
export const getComments = async (
    cursor: number,
    limit: number,
    postId: string,
    replyLimit: number,
    userId?: string
  ): Promise<{ count: number; comments: Record<string, any>; nextCursor: number | null }> => {
    try {
      // Fetch root comments and count in a single aggregation
      const [rootCommentResults, countResults] = await Promise.all([
        comments
          .find({ post_id: postId, parentId: null })
          .sort({ date: -1 })
          .skip(cursor)
          .limit(limit)
          .lean()
          .exec(),
        
        comments.countDocuments({
          post_id: postId,
          parentId: null
        })
      ]);
      const rootComments = rootCommentResults;
      const totalRootComments = countResults;
      if (rootComments.length === 0) {
        return { count: 0, comments: {}, nextCursor: null };
      }
      
      // Get all root comment IDs for reply fetching
      const rootCommentIds = rootComments.map(c => c._id.toString());
      
      // Fetch all replies in one query
      const allReplies = await comments
        .find({ parentId: { $in: rootCommentIds } })
        .sort({ date: -1 })
        .lean()
        .exec();
      
      // Collect all unique user IDs
      const userIdsToFetch = new Set<string>();
      for (const comment of rootComments) {
        userIdsToFetch.add(comment.user_id.toString());
      }
      
      for (const reply of allReplies) {
        userIdsToFetch.add(reply.user_id.toString());
      }
      
      // Fetch all users in a single query
      const userArray = Array.from(userIdsToFetch);
      const allUsers = await users.find({ _id: { $in: userArray } }).lean();
      
      // Create user info map for quick lookups
      const userInfoMap = new Map();
      for (const user of allUsers) {
        userInfoMap.set(user._id.toString(), {
          username: user.user_id,
          firstName: user.bio.first_name,
          lastName: user.bio.last_name,
          headline: user.bio?.headline,
          profilePicture: user.profile_photo,
          connectionDegree: "3rd+"
        });
      }
      
      // Organize replies by parent comment ID
      const repliesByParentId = new Map();
      const replyCountByParentId = new Map();
      for (const reply of allReplies) {
        const parentId = reply.parentId.toString();
        if (!repliesByParentId.has(parentId)) {
          repliesByParentId.set(parentId, []);
          replyCountByParentId.set(parentId, 0);
        }
        replyCountByParentId.set(parentId, replyCountByParentId.get(parentId) + 1);
        
        // Only add the reply if we're still under the limit
        if (repliesByParentId.get(parentId).length < replyLimit) {
          repliesByParentId.get(parentId).push(reply);
        }
      }
      
      // Build the result object
      const result: Record<string, any> = {};
      
      const rootCommentReactionsPromises = rootComments.map(comment => 
        getTopReactions(comment._id.toString(), targetTypeEnum.comment)
      );
      const rootCommentReactions = await Promise.all(rootCommentReactionsPromises);
      // Create a map of comment ID to reactions for quick lookups
      const commentReactionsMap = new Map();
      rootComments.forEach((comment, index) => {
        commentReactionsMap.set(comment._id.toString(), rootCommentReactions[index]);
      });

      // Also fetch reactions for replies
      const allReplyIds = allReplies.map(reply => reply._id.toString());
      const replyReactionsPromises = allReplyIds.map(replyId => 
        getTopReactions(replyId, targetTypeEnum.comment)
      );
      const replyReactionsResults = await Promise.all(replyReactionsPromises);
      
      // Create a map of reply ID to reactions
      const replyReactionsMap = new Map();
      allReplyIds.forEach((replyId, index) => {
        replyReactionsMap.set(replyId, replyReactionsResults[index]);
      });

      // Get current user's reactions if userId is provided
      const userReactionsMap = new Map();
      if (userId) {
        const reactionRepository = new ReactionRepository();
        
        // Get user's reactions to all root comments
        const rootCommentReactionPromises = rootComments.map(comment => 
          reactionRepository.getUserReaction(userId, comment._id.toString())
        );
        const rootCommentUserReactions = await Promise.all(rootCommentReactionPromises);
        
        // Map root comment reactions to their IDs
        rootComments.forEach((comment, index) => {
          userReactionsMap.set(comment._id.toString(), rootCommentUserReactions[index]?.reaction || null);
        });
        
        // Get user's reactions to all replies
        const replyReactionPromises = allReplies.map(reply => 
          reactionRepository.getUserReaction(userId, reply._id.toString())
        );
        const replyUserReactions = await Promise.all(replyReactionPromises);
        
        // Map reply reactions to their IDs
        allReplies.forEach((reply, index) => {
          userReactionsMap.set(reply._id.toString(), replyUserReactions[index]?.reaction || null);
        });
      }
      for (const rootComment of rootComments) {
        const rootId = rootComment._id.toString();
        const rootAuthorInfo = userInfoMap.get(rootComment.user_id.toString());
        if (rootComment.tagged_users && rootComment.tagged_users.length > 0) {
            const userIds = await convert_idIntoUser_id(rootComment.tagged_users);
            if (userIds) {
                rootComment.tagged_users = userIds;
            }
        }

        const rootReactions = commentReactionsMap.get(rootId);

        const transformedRootComment = {
          ...rootComment,
          media: rootComment.media ? {
            link: rootComment.media,
            mediaType: rootComment.media ? 'image' : 'none'
          } : {
            link: '',
            mediaType: 'none'
          },
          reactions: rootReactions.topReacts,
          reactionsCount: rootReactions.totalCount
        };
  
        // Process replies for this root comment
        const repliesWithAuthors: Record<string, any> = {};
        const replies = repliesByParentId.get(rootId) || [];
        for (const reply of replies) {
          const replyId = reply._id.toString();
          const replyAuthorInfo = userInfoMap.get(reply.user_id.toString());
          if (reply.tagged_users && reply.tagged_users.length > 0) {
            const userIds = await convert_idIntoUser_id(reply.tagged_users);
            if (userIds) {
                reply.tagged_users = userIds;
            }
        }
        const replyReactions = replyReactionsMap.get(replyId);
          repliesWithAuthors[replyId] = {
            ...reply,
            media: reply.media ? {
              link: reply.media,
              mediaType: reply.media ? 'image' : 'none'
            } : {
              link: '',
              mediaType: 'none'
            },
            author: replyAuthorInfo,
            userReaction: userReactionsMap.get(replyId) || null,
            reactions: replyReactions.topReacts,
            reactionsCount: replyReactions.totalCount
          };
        }
        
        // Add the root comment with its author and replies
        result[rootId] = {
          ...transformedRootComment,
          author: rootAuthorInfo,
          userReaction: userReactionsMap.get(rootId) || null,
          childrenCount:replyCountByParentId.get(rootId) ||null,
          children: Object.values(repliesWithAuthors)
        };
      }
      
      // Pagination calculation
      const hasNextPage = cursor + rootComments.length < totalRootComments;
      const nextCursor = hasNextPage ? cursor + limit : null;
      
      return {
        count: rootComments.length,
        comments: Object.values(result),
        nextCursor
      };
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Error fetching comments: ${err.message}`);
      } else {
        throw new Error("Error fetching comments: Unknown error");
      }
    }
  };

/**
 * Fetches paginated replies for a specific comment
 * @param commentId - The ID of the parent comment to fetch replies for
 * @param cursor - The position to start fetching replies from
 * @param limit - Maximum number of replies to fetch
 * @returns Promise containing the replies, count, and pagination info
 */
export const getReplies = async (
    commentId: string,
    cursor: number,
    limit: number
  ): Promise<{ count: number; replies: Record<string, any>; nextCursor: number | null }> => {
    try {
      // Fetch replies and count in a single promise
      const [replyResults, totalRepliesCount] = await Promise.all([
        comments
          .find({ parentId: commentId })
          .sort({ date: -1 })
          .skip(cursor)
          .limit(limit)
          .lean()
          .exec(),
        
        comments.countDocuments({
          parentId: commentId
        })
      ]);
      
      if (replyResults.length === 0) {
        return { count: 0, replies: {}, nextCursor: null };
      }
      
      // Collect all unique user IDs
      const userIdsToFetch = new Set<string>();
      for (const reply of replyResults) {
        userIdsToFetch.add(reply.user_id.toString());
      }
      
      // Fetch all users in a single query
      const userArray = Array.from(userIdsToFetch);
      const allUsers = await users.find({ _id: { $in: userArray } }).lean();
      
      // Create user info map for quick lookups
      const userInfoMap = new Map();
      for (const user of allUsers) {
        userInfoMap.set(user._id.toString(), {
          username: user.user_id,
          firstName: user.bio.first_name,
          lastName: user.bio.last_name,
          headline: user.bio?.headline,
          profilePicture: user.profile_photo,
          connectionDegree: "3rd+"
        });
      }
      
      // Build the result object
      const result: Record<string, any> = {};
      
      for (const reply of replyResults) {
        const replyId = reply._id.toString();
        const replyAuthorInfo = userInfoMap.get(reply.user_id.toString());
        
        // Handle tagged users if present
        if (reply.tagged_users && reply.tagged_users.length > 0) {
          const userIds = await convert_idIntoUser_id(reply.tagged_users);
          if (userIds) {
            reply.tagged_users = userIds;
          }
        }
        
        // Transform the reply data
        result[replyId] = {
          ...reply,
          media: reply.media ? {
            link: reply.media,
            mediaType: reply.media ? 'image' : 'none'
          } : {
            link: '',
            mediaType: 'none'
          },
          author: replyAuthorInfo
        };
      }
      
      // Pagination calculation
      const hasNextPage = cursor + replyResults.length < totalRepliesCount;
      const nextCursor = hasNextPage ? cursor + limit : null;
      
      return {
        count: replyResults.length,
        replies: Object.values(result),
        nextCursor
      };
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Error fetching replies: ${err.message}`);
      } else {
        throw new Error("Error fetching replies: Unknown error");
      }
    }
  };

  /**
   * Gets all children comment IDs for a specific comment
   * @param commentId - The ID of the parent comment
   * @returns Promise containing an array of all child comment IDs
   */
  export const getAllCommentChildrenIds = async (commentId: string): Promise<string[]> => {
    try {
      // Since we only allow one level of replies, we just need to find direct children
      const directChildren = await comments.find({ parentId: commentId }).lean().exec();
      
      // Map the children to their ID strings
      const childrenIds = directChildren.map(child => child._id.toString());
      
      return childrenIds;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Error fetching comment children: ${err.message}`);
      } else {
        throw new Error("Error fetching comment children: Unknown error");
      }
    }
  };

  export const deleteAllComments = async (postId: string): Promise<void> => {
    try {
      // Get all comments for this post
      const postComments = await comments.find({ post_id: new mongoose.Types.ObjectId(postId) }).lean().exec();
        
      for (const comment of postComments) {
          const commentId = (comment as any)._id.toString();
          
          // If it's a root comment (no parent), check for replies
          if (!comment.parentId) {
              const replies = await comments.find({ parentId: commentId });
              const replyIds = replies.map(reply => (reply as any)._id.toString());
              
              // Delete reactions for the replies
              if (replyIds.length > 0) {
                  await deleteCommentReactions(commentId, true, replyIds);
              } else {
                  await deleteCommentReactions(commentId, false);
              }
          }
          
          // Remove from user's activity
          await users.updateOne(
              { _id: comment.user_id },
              { $pull: { 'activity.comments': comment._id } }
          );
      }
      
      // Delete all comments for the post
      await comments.deleteMany({ post_id: new mongoose.Types.ObjectId(postId) });
      
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Error deleting comments: ${err.message}`);
      } else {
        throw new Error("Error deleting comments: Unknown error");
      }
    }
  };





