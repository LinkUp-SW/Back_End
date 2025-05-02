import mongoose, { PipelineStage } from "mongoose";
import posts, { postsInterface, postTypeEnum } from "../models/posts.model.ts";
import users, { accountStatusEnum } from "../models/users.model.ts";
import { getTopReactions, ReactionRepository } from "./reacts.repository.ts";
import { targetTypeEnum } from "../models/reactions.model.ts";
import { convert_idIntoUser_id, getFormattedAuthor } from "./user.repository.ts";
import { CommentRepository, deleteAllComments } from "./comment.repository.ts";
import { mediaTypeEnum } from "../models/posts.model.ts";
import { formatCompanyPost } from "../utils/helper.ts";

export class PostRepository {
  async create(
    userId: string | null,
    content: string,
    mediaLink: string[] | null,
    mediaType: string | null,
    commentsDisabled: string | null,
    publicPost: boolean | null,
    postType: postTypeEnum,
    taggedUsers?: mongoose.Types.ObjectId[] | undefined,
  ) {
    return posts.create({
      user_id: userId,
      content: content,
      media: {
              link:mediaLink,
              media_type:mediaType
          },
      comments_disabled:commentsDisabled,
      public_post:publicPost,
      tagged_users:taggedUsers,
      post_type:postType,     
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
      updateFields.is_edited=true;
    }
    
    return posts.findOneAndUpdate(
      { _id: postId },
      { $set: updateFields },
      { new: true, upsert: false }
    );
  }

  async findByPostId(id: string): Promise<postsInterface | null> {
    return posts.findOne({ _id: id });
  }

  


  async deletepost(id: string) {
    return posts.deleteOne({ _id: id });
  }


  async deleteAllRepostsOfPost(repostsIds: string[]) {
    const repostObjectIds = repostsIds.map(id => new mongoose.Types.ObjectId(id));
    // Find all reposts for this post first
    const repostsToDelete = await posts.find({ id: { $in: repostObjectIds }}) as postsInterface[];
    
    // For each repost, we need to clean up references from users
    for (const repost of repostsToDelete) {
      // Delete reactions and comments for thought-type reposts
      if (repost.post_type ===  postTypeEnum.repost_thought) {
        // Use your existing utility functions
        const repostId = repost._id
        await mongoose.model('reacts').deleteMany({ target_id: repostId });
        await deleteAllComments(repostId as string);
      }
      
      // Remove repost references from user activity
      await users.updateMany(
        { 'activity.reposted_posts': repost._id },
        { $pull: { 'activity.reposted_posts': repost._id } }
      );
    }
    
    // Delete all reposts for this post
    return posts.deleteMany({ post_id: repostsIds });
  }
  
}




/**
 * Enhances a post with additional metadata like reactions, author info, etc.
 * Handles both standard posts and reposts (instant or thought)
 * @param post The post object to enhance
 * @param userId The ID of the current viewing user
 * @param userSavedPosts Array of post IDs saved by the user (optional)
 * @returns Enhanced post with additional metadata
 */
export const enhancePost = async (
  post: any, 
  userId: string,
  userSavedPosts?: postsInterface[]
) => {
  // Convert to plain object if needed
  const plainPost = post.toObject ? post.toObject() : post;
  
  // Handle tagged users
  if (plainPost.tagged_users && plainPost.tagged_users.length > 0) {
    const userIds = await convert_idIntoUser_id(plainPost.tagged_users);
    if (userIds) {
      plainPost.tagged_users = userIds;
    }
  }
  
  // Get author information
  let authorInfo;
  if(post.is_company){
    authorInfo=await formatCompanyPost(post);
  }else authorInfo = await getFormattedAuthor(post.user_id);
  
  // Check if post is saved by user
  const isSaved = userSavedPosts ? 
      userSavedPosts.some(savedPostId => savedPostId.toString() === post._id.toString()) 
      : false;

  // Initialize reaction variables
  const reactionRepository = new ReactionRepository();
  let reactions;
  let userReaction;
  let originalPost;
  let originalAuthorInfo;
  let commentsCount;
  const isRepost = plainPost.media?.media_type === mediaTypeEnum.post && 
                     plainPost.media?.link?.length > 0;
  // Handle reposts
  if (isRepost) {
      const postsRepository = new PostRepository();
      const originalPostId = plainPost.media.link[0];
      originalPost = await postsRepository.findByPostId(originalPostId) as postsInterface;
      if (originalPost.tagged_users && originalPost.tagged_users.length > 0) {
        const userIds = await convert_idIntoUser_id(originalPost.tagged_users);
        if (userIds) {
            originalPost.tagged_users = userIds;
        }
    }
      if (originalPost) {
          originalAuthorInfo = await getFormattedAuthor(originalPost.user_id);
          
          // For instant reposts, get reactions and user reaction from the original post
          if (post.post_type === postTypeEnum.repost_instant) {
              reactions = await getTopReactions(originalPostId, targetTypeEnum.post);
              userReaction = await reactionRepository.getUserReaction(
                  userId,
                  originalPostId.toString()
                );
              commentsCount=originalPost.comments?.length || 0;
          } else {
              // For thought reposts, get reactions from the repost itself
              reactions = await getTopReactions(post._id.toString(), targetTypeEnum.post);
              userReaction = await reactionRepository.getUserReaction(
                  userId,
                  post._id.toString()
                );
              commentsCount=plainPost.comments?.length || 0;
          }
          originalPost = originalPost.toObject ? originalPost.toObject() : originalPost;
          originalPost={
            ...originalPost,
            author:originalAuthorInfo
          }
          
          // Return enhanced repost
          return {
              ...plainPost,
              author: authorInfo,
              original_post:originalPost,
              is_saved:isSaved,
              user_reaction: userReaction?.reaction ?? null,
              top_reactions: reactions?.finalArray || [],
              reactions_count: reactions?.totalCount || 0,
              comments_count: commentsCount,
              reposts_count: originalPost.reposts?.length || 0
          };
      }
  }
  // Standard post handling
  reactions = await getTopReactions(post._id.toString(), targetTypeEnum.post);
  userReaction = await reactionRepository.getUserReaction(
      userId,
      post._id.toString()
  );
  // Return enhanced standard post
  return {
      ...plainPost,
      author: authorInfo,
      is_saved:isSaved,
      user_reaction: userReaction?.reaction ?? null,
      top_reactions: reactions?.finalArray || [],
      reactions_count: reactions?.totalCount || 0,
      comments_count: plainPost.comments?.length || 0,
      reposts_count: plainPost.reposts?.length || 0
  };
};

/**
 * Enhances multiple posts with additional metadata in a batch
 * @param posts Array of posts to enhance
 * @param userId The ID of the current viewing user
 * @param userSavedPosts Array of post IDs saved by the user (optional)
 * @returns Array of enhanced posts
 */
export const enhancePosts = async (
  posts: any[],
  userId: string,
  userSavedPosts?: postsInterface[]
) => {
  return Promise.all(posts.map(post => 
      enhancePost(post, userId, userSavedPosts)
  ));
};


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
): Promise<{ posts: any[]; next_cursor: number | null }> => {
  try {
    if (!savedPosts || savedPosts.length === 0) {
      return { posts: [], next_cursor: null };
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
    
    // Create author info map for quick lookups
    const authorMap = new Map();
    for (const userId of userIds) {
      const authorInfo = await getFormattedAuthor(userId);
      if (authorInfo) {
        authorMap.set(userId, authorInfo);
      }
    }
    
    // Enrich posts with author information
    const enrichedPosts = [];
    for (const postId of postsToFetch) {
      const post = postsData.find(p => p._id.toString() === postId.toString());
      if (post) {
        const authorInfo = authorMap.get(post.user_id.toString());
        enrichedPosts.push({
          ...post,
          author: authorInfo || null
        });
      }
    }
    
    // Determine pagination info
    const hasNextPage = endIndex < totalCount;
    const nextCursor = hasNextPage ? endIndex : null;
    
    return { 
      posts: enrichedPosts, 
      next_cursor:nextCursor 
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
): Promise<{ posts: any[]; next_cursor: number | null }> => {
  try {
    // Combine connections and followers, removing duplicates
    const userIdsToFetch = [...new Set([...connectionIds, ...followingIds])];
    
    // Handle empty connections/followers case
    if (!userIdsToFetch || userIdsToFetch.length === 0) {
      return { posts: [], next_cursor: null };
    }

    // Convert string IDs to ObjectIds
    const userObjectIds = userIdsToFetch.map(id => new mongoose.Types.ObjectId(id));
    const adjustedLimit = limit * 2; // Request double to account for filtering
    
    // Get activity IDs (posts and interactions)
    const activityQuery: PipelineStage[] = [
      // start with direct posts
      { 
        $match: { 
          user_id: { $in: userObjectIds }, 
          ...(cursor ? { date: { $lt: cursor } } : {}) 
        } 
      },
      { 
        $project: { 
          _id: 1, 
          date: 1, 
          type: { $literal: 'post' }, 
          actor: '$user_id',
          postType: '$post_type',
          originalPost: { 
            $cond: {
              if: { $isArray: "$media.link" },
              then: { $arrayElemAt: ['$media.link', 0] },
              else: null
            }
          } 
        } 
      },
  
      // reactions on posts 
      { 
        $unionWith: {
          coll: 'reacts',
          pipeline: [
            { $match: { user_id: { $in: userObjectIds }, target_type: targetTypeEnum.post, ...(cursor ? { date: { $lt: cursor } } : {}) } },
            { $project: { _id: '$target_id', date: 1, type: { $literal: 'reaction' }, actor: '$user_id' } }
          ]
        } 
      },
  
      // comments on posts
      { 
        $unionWith: {
          coll: 'comments',
          pipeline: [
            { $match: { user_id: { $in: userObjectIds }, ...(cursor ? { date: { $lt: cursor } } : {}) } },
            { $project: { _id: '$post_id', date: 1, type: { $literal: 'comment' }, actor: '$user_id', commentId: '$_id'} }
          ]
        } 
      },
  
      // dedupe (keep most-recent activity on the same post)
      { 
        $group: {
          _id: '$_id',                     // post id
          lastActivity: { $max: '$date' },
          kind: { $first: '$type' },       // activity type
          actor: { $first: '$actor' },     // user ID
          commentId: { $first: '$commentId' },
          postType: { $first: '$postType' },
          originalPost: { $first: '$originalPost' }      
        } 
      },
  
      { $sort: { lastActivity: -1, _id: -1 } },
      { $limit: adjustedLimit + 1 }        // one extra to know if there's more
    ];
    
    // Execute the first query to get activity IDs
    const activities = await posts.aggregate(activityQuery).exec();
    const hasMoreActivities = activities.length > adjustedLimit;
    // Extract post IDs from activities
    const postIds = activities.map(a => new mongoose.Types.ObjectId(a._id));
    
    // If no posts found, return early
    if (postIds.length === 0) {
      return { posts: [], next_cursor: null };
    }
    
    // Get full post data and exclude user's own posts
    const postsData = await posts.find({ 
      _id: { $in: postIds },
      ...(userId ? { user_id: { $ne: userId } } : {})
    }).lean();
    
    // Map post data by ID for quick lookup
    const postsMap = new Map();
    postsData.forEach(post => {
      postsMap.set(post._id.toString(), post);
    });
    
    // Organize posts in activity order and add activity metadata
    const orderedPosts = [];
    for (const activity of activities) {
      const post = postsMap.get(activity._id.toString());
      if (post) {
        // Add activity metadata
        post.activityType = activity.kind;
        post.activityActor = activity.actor;
        if (activity.commentId) {
          post.commentId = activity.commentId;
        }
        orderedPosts.push(post);
      }
    }

    // Get user's saved posts for the enhancePosts function
    let userSavedPosts;
    if (userId) {
      const userData = await users.findById(userId, { savedPosts: 1 });
      userSavedPosts = userData?.savedPosts || [];
    }
    
    // Use the enhancePosts function to add all necessary metadata
    const enhancedPosts = await enhancePosts(
      orderedPosts,
      userId || '',
      userSavedPosts
    );
    
    // Add activity context to enhanced posts
    const actorIds = new Set<string>();
    enhancedPosts.forEach(post => {
      if (post.activityType !== 'post' && post.activityActor) {
        actorIds.add(post.activityActor.toString());
      }
    });
    
    // If we have actors, fetch their data
    if (actorIds.size > 0) {
      const actorData = await users.find(
        { _id: { $in: Array.from(actorIds).map(id => new mongoose.Types.ObjectId(id)) } },
        { _id: 1, user_id: 1, 'bio.first_name': 1, 'bio.last_name': 1, profile_photo: 1 }
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
      
      // Add activity context to each post
      for (const post of enhancedPosts) {
        if (post.activityType !== 'post' && post.activityActor) {
          const actorInfo = actorMap.get(post.activityActor.toString());
          if (actorInfo) {
            post.activity_context = {
              type: post.activityType,
              actor_name: actorInfo.name,
              actor_username: actorInfo.username,
              actor_id: actorInfo.id,
              actor_picture: actorInfo.profilePicture
            };
            
            // Add specific context for reactions
            if (post.activityType === 'reaction') {
              const reactionRepository = new ReactionRepository();
              const reaction = await reactionRepository.getUserReaction(
                post.activityActor.toString(),
                post._id.toString()
              );
              
              if (reaction) {
                post.activity_context.type = reaction.reaction;
              }
            }
            
            // Add comment data for comment activities
            if (post.activityType === 'comment' && post.commentId) {
              const commentRepository = new CommentRepository();
              const comment = await commentRepository.findById(post.commentId);
              if (comment) {
                const plainComment = comment.toObject ? comment.toObject() : comment;
                const {finalArray, totalCount} = await getTopReactions(post.commentId, targetTypeEnum.comment);
                const author = await getFormattedAuthor(comment.user_id.toString());
                post.activity_context.comment = {
                  ...plainComment, 
                  top_reactions: finalArray,
                  reactions_count: totalCount, 
                  author
                };
              }
            }
          }
        }
        
        // Remove temporary fields
        delete post.activityType;
        delete post.activityActor;
        delete post.commentId;
      }
    }
    
    // Filter posts based on privacy settings
    const filteredPosts = enhancedPosts.filter(post => {
      const isPublicPost = post.public_post === true;
      const isFromConnection = connectionIds.includes(post.user_id.toString());
      
      return (isPublicPost || isFromConnection) && 
             !(post.author?.accountStatus === accountStatusEnum.private && !isFromConnection);
    });
    
    // Handle pagination
    const hasMorePosts = filteredPosts.length > limit;
    const finalPosts = hasMorePosts ? filteredPosts.slice(0, limit) : filteredPosts;
    // Calculate next cursor
    let nextCursor = null;
    if ((hasMorePosts||hasMoreActivities) && finalPosts.length > 0)  nextCursor = finalPosts[finalPosts.length - 1].date
    // const nextCursor = hasMorePosts && finalPosts.length > 0
    //   ? finalPosts[finalPosts.length - 1].date
    //   : null;
      
    return { posts: finalPosts, next_cursor: nextCursor };
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Error fetching posts feed: ${err.message}`);
    } else {
      throw new Error("Error fetching posts feed: Unknown error");
    }
  }
};


