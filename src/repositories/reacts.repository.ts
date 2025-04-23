import reactions from '../models/reactions.model.ts';
import users from '../models/users.model.ts';
import { targetTypeEnum } from '../models/reactions.model.ts';
import mongoose from 'mongoose';

export class ReactionRepository {
  async addReaction(userId: string, targetId: string, targetType: targetTypeEnum, reactionType: string) {
    // First check if a reaction already exists
    const existingReaction = await reactions.findOne({ 
      user_id: userId, 
      target_id: targetId 
    });
    
    // Update or create the reaction
    const result = await reactions.findOneAndUpdate(
      { user_id: userId, target_id: targetId },
      { 
        user_id: userId,
        target_id: targetId,
        target_type: targetType,
        reaction: reactionType
      },
      { 
        new: true,
        upsert: true
      }
    );
    
    // Return both the result and whether it was an update
    return {
      reaction: result,
      wasUpdated: existingReaction !== null,
      previousReaction: existingReaction ? existingReaction.reaction : null
    };
  }

  async removeReaction(userId: string, targetId: string) {
    return reactions.findOneAndDelete({ user_id: userId, target_id: targetId });
  }

  async getReactionsByTarget(targetId: string, targetType: targetTypeEnum) {
    return reactions.find({ target_id: targetId, target_type: targetType });
  }

  async getUserReaction(userId: string, targetId: string) {
    return reactions.findOne({ user_id: userId, target_id: targetId });
    
  }
  
}

/**
 * Gets the top 3 most common reactions and total reaction count for a specific target
 * @param targetId - The ID of the target (post, comment)
 * @param targetType - The type of target (post, comment)
 * @returns Promise containing an array of the top 3 reactions and their counts
 */
export const getTopReactions = async (targetId: string, targetType: targetTypeEnum): Promise<{topReacts: any[], totalCount: number}> => {
    // Get top 3 reactions
    const topReacts = await reactions.aggregate([
        // Match documents for the specific target
        { $match: { target_id: targetId, target_type: targetType } },
        // Group by reaction type and count occurrences
        { $group: { _id: "$reaction", count: { $sum: 1 } } },
        // Sort by count in descending order
        { $sort: { count: -1 } },
        // Limit to top 3 results
        { $limit: 3 },
        // Project to rename _id to reaction for clearer output
        { $project: { reaction: "$_id", _id: 0 } }
    ]);

    // Get total count of all reactions
    const totalCount = await reactions.countDocuments({ 
        target_id: targetId, 
        target_type: targetType 
    });

    return {
        topReacts,
        totalCount
    };
}

/**
 * Gets paginated reactions for a target with author details and reaction counts
 * @param targetId - The ID of the target (post, comment)
 * @param targetType - The type of target (post, comment)
 * @param cursor - The position to start fetching from (null for beginning)
 * @param limit - Maximum number of reactions to fetch
 * @param specificReaction - Optional filter for a specific reaction type
 * @returns Promise containing reactions data, counts and pagination info
 */
export const getPaginatedReactions = async (
  targetId: string, 
  targetType: targetTypeEnum,
  cursor: number | null = 0,
  limit: number = 10,
  specificReaction?: string
): Promise<{
  reactions: any[],
  totalCount: number,
  reactionCounts: Record<string, number>,
  nextCursor: number | null
}> => {
  try {
    // Build the match condition
    const matchCondition: any = { 
      target_id: new mongoose.Types.ObjectId(targetId), 
      target_type: targetType 
    };
    
    // Add specific reaction filter if provided
    if (specificReaction) {
      matchCondition.reaction = specificReaction;
    }
    
    // Get total count and reaction type counts in one aggregation
    const countData = await reactions.aggregate([
      { $match: matchCondition },
      { $facet: {
        totalCount: [
          { $count: 'count' }
        ],
        reactionCounts: [
          { $group: { _id: "$reaction", count: { $sum: 1 } } }
        ]
      }}
    ]);
    
    const totalCount = countData[0].totalCount[0]?.count || 0;
    
    // Format reaction counts into a simple object
    const reactionCounts: Record<string, number> = {};
    countData[0].reactionCounts.forEach((item: any) => {
      reactionCounts[item._id] = item.count;
    });
    // If no reactions, return empty result
    if (totalCount === 0) {
      return {
        reactions: [],
        totalCount: 0,
        reactionCounts: {},
        nextCursor: null
      };
    }


    // Execute query with sort and limit
    const paginatedReactions = await reactions.find(matchCondition)
      .sort({ createdAt: -1 })
      .skip(cursor ?? 0)
      .limit(limit)
      .lean()
      .exec();

    // Check if there are more results
    const hasMore = paginatedReactions.length > limit;
    const results = hasMore ? paginatedReactions.slice(0, limit) : paginatedReactions;
    
    // Get user details for each reaction
    const userIds = results.map((reaction: any) => reaction.user_id);
    const userDetails = await users.find({ _id: { $in: userIds } }).lean().exec();

    // Map user details to reactions
    const reactionsWithUserDetails = results.map((reaction: any) => {
      const user = userDetails.find((user: any) => user._id.toString() === reaction.user_id.toString());
      return {
        ...reaction,
        author: user ? {
          username: user.user_id,
          firstName: user.bio?.first_name || '',
          lastName: user.bio?.last_name || '',
          headline: user.bio?.headline || '',
          profilePicture: user.profile_photo || '',
          connectionDegree: "3rd+"
        } : null
      };
    });

    const hasMoreResults = totalCount > (cursor ?? 0) + limit;
    const nextCursor = hasMoreResults ? (cursor ?? 0) + limit : null;

    return {
      reactions: reactionsWithUserDetails,
      totalCount,
      reactionCounts,
      nextCursor
    };
  } catch (err) {
    if (err instanceof Error)
    {throw new Error(`Error fetching reactions: ${err.message}`);}
    else {
        throw new Error("Error fetching reactions: Unknown error");
      }
  }
};

