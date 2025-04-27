import mongoose, { PipelineStage } from "mongoose";
import posts from "../models/posts.model.ts";
import users from "../models/users.model.ts";
import { getTopReactions, ReactionRepository } from "./reacts.repository.ts";
import { targetTypeEnum } from "../models/reactions.model.ts";

export class PostRepository {
  async create(
    userId: string,
    content: string,
    mediaLink: string[] | null,
    mediaType: string | null,
    commentsDisabled: string | null,
    publicPost: boolean | null,
    taggedUsers?: mongoose.Types.ObjectId[] | undefined
  ) {
    return posts.create({
      user_id:userId,
      content:content,
      media: {
              link:mediaLink,
              media_type:mediaType
          },
      comments_disabled:commentsDisabled,
      public_post:publicPost,
      tagged_users:taggedUsers
     
    });
  }

  async update(postId: string,content: string,
    mediaLink: string[] | null,
    mediaType: string | undefined,
    commentsDisabled: string | null,
    publicPost: boolean| null,
    taggedUsers: mongoose.Types.ObjectId[] | undefined,
  ) {
    const updateFields: any = {};
    if (content!== null) updateFields.content = content;
    if (mediaLink !== null || mediaType !== undefined) {
      updateFields.media = {};
      if (mediaLink !== null) updateFields.media.link = mediaLink;
      if (mediaType !== null) updateFields.media.media_type = mediaType;
    }
    if (commentsDisabled !== null) updateFields.comments_disabled = commentsDisabled;
    if (publicPost !== null) updateFields.public_post = publicPost;
    if (taggedUsers!== undefined) updateFields.tagged_users = taggedUsers;
    if ( content!== null|| mediaLink !== null || mediaType !== undefined || commentsDisabled !== null || publicPost !== null || taggedUsers!== undefined){
      updateFields.isEdited=true;
    }
    
    return posts.findOneAndUpdate(
      { _id: postId },
      { $set: updateFields },
      { new: true, upsert: false }
    );
  }

  async findByPostId(id: string) {
    return posts.findOne({ _id: id });
  }

  


  async deletepost(id: string) {
    return posts.deleteOne({ _id: id });
  }

  
}
/**
 * Fetches paginated posts for a user using cursor-based pagination
 * @param savedPosts - Array of post IDs to fetch
 * @param cursor - The position to start fetching from (null for beginning)
 * @param limit - Maximum number of posts to fetch
 * @returns Promise containing the posts, count, and pagination info
 */
export const getSavedPostsCursorBased = async (
  savedPosts: string[],
  cursor: number | null, 
  limit: number
): Promise<{ posts: any[]; nextCursor: number | null }> => {
  try {
    if (!savedPosts || savedPosts.length === 0) {
      return { posts: [], nextCursor: null };
    }
    
    // Convert cursor to number with default value of 0
    const startIndex = cursor === null ? 0 : cursor;
    
    // Get total count of saved posts
    const totalCount = savedPosts.length;
    
    // Calculate the range of posts to fetch
    const endIndex = Math.min(startIndex + limit, totalCount);
    const postsToFetch = savedPosts.slice(startIndex, endIndex);
    
    // Fetch all the posts in a single query
    const postsData = await posts.find({ 
      _id: { $in: postsToFetch } 
    }).lean();
    
    // Extract all unique user IDs
    const userIds = new Set<string>();
    postsData.forEach(post => userIds.add(post.user_id.toString()));
    
    // Fetch all authors in a single query
    const authors = await users.find({ 
      _id: { $in: Array.from(userIds) } 
    }).lean();
    
    // Create author info map for quick lookups
    const authorMap = new Map();
    for (const author of authors) {
      authorMap.set(author._id.toString(), {
        username: author.user_id,
        firstName: author.bio.first_name,
        lastName: author.bio.last_name,
        headline: author.bio?.headline,
        profilePicture: author.profile_photo,
        connectionDegree: "3rd+" // Default connection degree
      });
    }
    
    // Enrich posts with author information
    const enrichedPosts = [];
    for (const postId of postsToFetch) {
      const post = postsData.find(p => p._id.toString() === postId.toString());
      if (post) {
        const authorInfo = authorMap.get(post.user_id.toString());
        const plainPost = post.toObject ? post.toObject() : post;
        enrichedPosts.push({
          ...plainPost,
          author: authorInfo || null
        });
      }
    }
    
    // Determine pagination info
    const hasNextPage = endIndex < totalCount;
    const nextCursor = hasNextPage ? endIndex : null;
    
    return { 
      posts: enrichedPosts, 
      nextCursor 
    };
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Error fetching saved posts: ${err.message}`);
    } else {
      throw new Error("Error fetching saved posts: Unknown error");
    }
  }
};


/**
 * Fetches feed showing posts and interactions from connections and following users.
 * @param userId - The ID of the user viewing the feed
 * @param connectionIds - The user IDs of direct connections
 * @param followingIds - The user IDs of people the user follows
 * @param cursor - The cursor timestamp (Unix timestamp)
 * @param limit - The number of posts per page
 * @returns An object containing the posts and the next cursor, if available
 */
export const getPostsCursorBased = async (
  userId: string | null,
  connectionIds: string[],
  followingIds: string[] = [],
  cursor: number | null, // Unix timestamp
  limit: number
): Promise<{ posts: any[]; nextCursor: number | null }> => {
  try {
    // Combine connections and followers, removing duplicates
    const userIdsToFetch = [...new Set([...connectionIds, ...followingIds])];
    
    // Handle empty connections/followers case
    if (!userIdsToFetch || userIdsToFetch.length === 0) {
      return { posts: [], nextCursor: null };
    }

    // Convert string IDs to ObjectIds
    const userObjectIds = userIdsToFetch.map(id => new mongoose.Types.ObjectId(id));
    
    // If cursor is provided, create a Date object for comparison
    const cursorDate = cursor ? new Date(cursor * 1000) : null;

    // First, get all activity IDs (posts and interactions)
    const activityQuery: PipelineStage[] = [

      // start with direct posts
      { $match: { user_id: { $in: userIdsToFetch }, ...cursorDate } },
      { $project: { _id: 1, date: 1, type: { $literal: 'post' }, actor: '$user_id' } },
  
      // ❷ reactions on posts -------------------------------------------------
      { $unionWith: {
          coll: 'reacts',
          pipeline: [
            { $match: { user_id: { $in: userObjectIds }, target_type: targetTypeEnum.post, ...cursorDate } },
            { $project: { _id: '$target_id', date: 1, type: { $literal: 'reaction' }, actor: '$user_id' } }
          ]
        } },
  
      // ❸ comments on posts --------------------------------------------------
      { $unionWith: {
          coll: 'comments',
          pipeline: [
            { $match: { user_id: { $in: userObjectIds }, ...cursorDate } },
            { $project: { _id: '$post_id', date: 1, type: { $literal: 'comment' }, actor: '$user_id' } }
          ]
        } },
  
      // ❹ reposts ------------------------------------------------------------
      { $unionWith: {
          coll: 'reposts',
          pipeline: [
            { $match: { user_id: { $in: userObjectIds }, ...cursorDate } },
            { $project: { _id: '$post_id', date: 1, type: { $literal: 'repost' }, actor: '$user_id' } }
          ]
        } },
  
      // ❺ dedupe (keep most-recent activity on the same post)
      { $group: {
        _id: '$_id',                       // post id
        lastActivity: { $max: '$date' },
        kind: { $first: '$type' },         // Using 'kind' for activity type
        actor: { $first: '$actor' }        // Using 'actor' for user ID
      } },
  
      { $sort : { lastActivity: -1 } },
      { $limit: limit + 1 }                  // one extra to know if there’s more
    ];
    
    // Execute the first query to get activity IDs
    const activities = await posts.aggregate(activityQuery).exec();
    // Extract post IDs from activities
    const postIds = activities.map(a => new mongoose.Types.ObjectId(a._id));
    
    // If no posts found, return early
    if (postIds.length === 0) {
      return { posts: [], nextCursor: null };
    }
    
    // Second query: Get complete post data for the IDs we found
    const postsQuery: PipelineStage[] = [
      // 1. Match only the posts we need
      { 
        $match: { 
          _id: { $in: postIds },
          ...(userId ? { _id: { $ne: userId.toString() } } : {}) // Exclude user's own posts
        } 
      },
      
      // 2. Lookup comments
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post_id",
          as: "comments"
        }
      },
      
      // 3. Lookup reposts
      {
        $lookup: {
          from: "reposts",
          localField: "_id",
          foreignField: "post_id",
          as: "reposts"
        }
      },
      
      // 4. Lookup author details
      {
        $lookup: {
          from: "users",
          let: { userId: "$user_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
            {
              $project: {
                _id: 1,
                user_id: 1,
                "bio.first_name": 1,
                "bio.last_name": 1,
                "bio.headline": 1,
                profile_photo: 1
              }
            }
          ],
          as: "authorData"
        }
      },
      
      // 5. Unwind author data into object
      {
        $unwind: {
          path: "$authorData",
          preserveNullAndEmptyArrays: true
        }
      },
      
      // 6. Project only fields we need
      {
        $project: {
          _id: 1,
          content: 1,
          date: 1,
          media: 1,
          comments_disabled: 1,
          public_post: 1,
          tagged_users: 1,
          isEdited: 1,
          user_id: 1,
          commentsCount: { $size: "$comments" },
          repostsCount: { $size: "$reposts" },
          author: {
            _id: "$authorData._id",
            username: "$authorData.user_id",
            firstName: "$authorData.bio.first_name",
            lastName: "$authorData.bio.last_name",
            headline: "$authorData.bio.headline",
            profilePicture: "$authorData.profile_photo"
          }
        }
      }
    ];
    // Execute the second query to get full post data
    const completePostsData = await posts.aggregate(postsQuery).exec();
    
    // Create a map of posts by ID for easy access
    const postsMap = new Map();
    completePostsData.forEach(post => {
      postsMap.set(post._id.toString(), post);
    });
    
    // Arrange posts according to activity order
    const orderedPosts = [];
    for (const activity of activities) {
      const post = postsMap.get(activity._id.toString());
      if (post && !(userId?.toString() && post.user_id === userId?.toString())) {
        // Add activity type to post
        post.activityType = activity.kind; // note: 'kind' from your aggregation, not 'type'
        post.actorId = activity.actor; // use 'actor' from your aggregation
        orderedPosts.push(post);
      }
    }
    // Determine if there are more posts
    const hasNextPage = orderedPosts.length > limit;
    
    // Get final post list (remove extra post used for pagination)
    const postsToReturn = hasNextPage ? orderedPosts.slice(0, limit) : orderedPosts;
    const actorIds = new Set<string>();
postsToReturn.forEach(post => {
  if (post.activityType !== 'post' && post.actorId) {
    actorIds.add(post.actorId.toString());
  }
});
    
    // Fetch all actor information in one query
    const actorData = await users.find(
      { _id: { $in: Array.from(actorIds).map(id => new mongoose.Types.ObjectId(id)) } },
      { _id: 1, user_id: 1, 'bio.first_name': 1, 'bio.last_name': 1,profile_photo:1 }
    ).lean();
    
    // Create actor info map
    const actorMap = new Map();
    actorData.forEach(actor => {
      actorMap.set(actor._id.toString(), {
        name: `${actor.bio?.first_name || ''} ${actor.bio?.last_name || ''}`.trim() || actor.user_id,
        id: actor._id,
        username: actor.user_id,
        profilePicture: actor.profile_photo 
      });
    });

    // Enhance posts with reactions data
    const enhancedPosts = await Promise.all(
      postsToReturn.map(async (post) => {
        const isPublicPost = post.public_post === true;
        const isFromConnection = connectionIds.includes(post.user_id.toString());
        // Skip this post if it's private and not from a connection
        if (!isPublicPost && !isFromConnection) {
          return null; // This post will be filtered out
        }
        // 1. Get top reactions
        const { topReacts, totalCount } = await getTopReactions(
          post._id.toString(),
          targetTypeEnum.post
        );
        
        // 2. Get user's reaction if userId is provided
        let userReaction = null;
        if (userId) {
          const reaction = await new ReactionRepository().getUserReaction(
            userId,
            post._id.toString()
          );
          userReaction = reaction ? reaction.reaction : null;
        }
        
        // 3. Add activity context based on type
        let activityContext = null;
        if (post.activityType !== 'post' && post.actorId) {
          const actorInfo = actorMap.get(post.actorId.toString());
          if (actorInfo) {
            activityContext = {
              type: post.activityType,
              actorName: actorInfo.name,
              actorUserName: actorInfo.username, // Use the username from actorMap
              actorId: actorInfo.id,
              actorPicture: actorInfo.profilePicture
            };
          }
        }
        let author = post.author;
    // If author is empty but user_id exists, fetch author directly
    if ((!author || Object.keys(author).length === 0) && post.user_id) {
      const postAuthor = await users.findOne(
        { _id: post.user_id },
        {
          _id: 1,
          user_id: 1,
          "bio.first_name": 1,
          "bio.last_name": 1,
          "bio.headline": 1,
          profile_photo: 1
        }
      ).lean();
      
      if (postAuthor) {
        author = {
          _id: postAuthor._id,
          username: postAuthor.user_id,
          firstName: postAuthor.bio?.first_name || "",
          lastName: postAuthor.bio?.last_name || "",
          headline: postAuthor.bio?.headline || "",
          profilePicture: postAuthor.profile_photo || ""
        };
      }
    }
      
        // Remove temp fields
        const { activityType, activityUserId, ...cleanPost } = post;
        return {
          ...cleanPost,
          author,
          topReactions: topReacts,
          reactionsCount: totalCount,
          userReaction,
          activityContext
        };
      })
    );
    // Calculate next cursor from the last post's date
    const nextCursor = hasNextPage && postsToReturn.length > 0
      ? Math.floor(new Date(postsToReturn[postsToReturn.length - 1].date).getTime() / 1000)
      : null;
    const filteredPosts = enhancedPosts.filter(post => post !== null);
    return { posts: filteredPosts, nextCursor };
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Error fetching posts feed: ${err.message}`);
    } else {
      throw new Error("Error fetching posts feed: Unknown error");
    }
  }
};