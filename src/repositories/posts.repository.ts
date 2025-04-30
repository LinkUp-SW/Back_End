import mongoose, { PipelineStage } from "mongoose";
import posts, { postsInterface, postTypeEnum } from "../models/posts.model.ts";
import users, { accountStatusEnum } from "../models/users.model.ts";
import { getTopReactions, ReactionRepository } from "./reacts.repository.ts";
import { targetTypeEnum } from "../models/reactions.model.ts";
import { convert_idIntoUser_id, getFormattedAuthor } from "./user.repository.ts";
import { CommentRepository, deleteAllComments } from "./comment.repository.ts";
import { mediaTypeEnum } from "../models/posts.model.ts";

export class PostRepository {
  async create(
    userId: string,
    content: string,
    mediaLink: string[] | null,
    mediaType: string | null,
    commentsDisabled: string | null,
    publicPost: boolean | null,
    postType: postTypeEnum,
    taggedUsers?: mongoose.Types.ObjectId[] | undefined,
  ) {
    console.log(postType)
    return posts.create({
      user_id:userId,
      content:content,
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
  const authorInfo = await getFormattedAuthor(post.user_id);
  
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
  if (isRepost) { {
      const postsRepository = new PostRepository();
      const originalPostId = plainPost.media.link[0];
      originalPost = await postsRepository.findByPostId(originalPostId) as postsInterface;
      
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
          
          // Return enhanced repost
          return {
              ...plainPost,
              author: authorInfo,
              original_post:originalPost,
              original_author: originalAuthorInfo,
              is_saved:isSaved,
              user_reaction: userReaction?.reaction ?? null,
              top_reactions: reactions?.finalArray || [],
              reactions_count: reactions?.totalCount || 0,
              comments_count: commentsCount
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
      comments_count: plainPost.comments?.length || 0
  };
};
}
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
        const plainPost = post.toObject ? post.toObject() : post;
        if (plainPost.tagged_users && plainPost.tagged_users.length > 0) {
                    const userIds = await convert_idIntoUser_id(plainPost.tagged_users);
                    if (userIds) {
                        plainPost.tagged_users = userIds;
                    }
                }
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
    
    // If cursor is provided, create a proper date filter using Unix timestamp directly
    let dateFilter = {};
    if (cursor) {
      // Create filter for Unix timestamps (don't convert to Date object)
      dateFilter = { date: { $lt: cursor } };
    }
    const adjustedLimit = limit * 2; // Request double to account for filtering
    //get all activity IDs (posts and interactions)
    const activityQuery: PipelineStage[] = [

      // start with direct posts
      { $match: { user_id: { $in: userObjectIds }, ...(cursor ? { date: { $lt: cursor } } : {}) } },
      { $project: { 
          _id: 1, 
          date: 1, 
          type: { $literal: 'post' }, 
          actor: '$user_id',
          postType: '$post_type',
          originalPost: { $arrayElemAt: ['$media.link', 0] } 
        } 
      },
  
      //  reactions on posts 
      { $unionWith: {
          coll: 'reacts',
          pipeline: [
            { $match: { user_id: { $in: userObjectIds }, target_type: targetTypeEnum.post, ...(cursor ? { date: { $lt: cursor } } : {}) } },
            { $project: { _id: '$target_id', date: 1, type: { $literal: 'reaction' }, actor: '$user_id' } }
          ]
        } },
  
      //  comments on posts
      { $unionWith: {
          coll: 'comments',
          pipeline: [
            { $match: { user_id: { $in: userObjectIds }, ...(cursor ? { date: { $lt: cursor } } : {}) } },
            { $project: { _id: '$post_id', date: 1, type: { $literal: 'comment' }, actor: '$user_id', commentId: '$_id'} }
          ]
        } },
  
      //  dedupe (keep most-recent activity on the same post)
      { $group: {
        _id: '$_id',                       // post id
        lastActivity: { $max: '$date' },
        kind: { $first: '$type' },         // Using 'kind' for activity type
        actor: { $first: '$actor' },       // Using 'actor' for user ID
        commentId: { $first: '$commentId' },
        postType: { $first: '$postType' },
        originalPost: { $first: '$originalPost' }      
      } },
  
      { $sort : { lastActivity: -1 } },
      { $limit: adjustedLimit + 1 }                  // one extra to know if there's more
    ];
    
    // Execute the first query to get activity IDs
    const activities = await posts.aggregate(activityQuery).exec();
    
    // Extract post IDs from activities
    const postIds = activities.map(a => new mongoose.Types.ObjectId(a._id));
    
    // If no posts found, return early
    if (postIds.length === 0) {
      return { posts: [], next_cursor: null };
    }
    
    // Second query: Get complete post data for the IDs we found
    const postsQuery: PipelineStage[] = [
      // 1. Match only the posts we need
      { 
        $match: { 
          _id: { $in: postIds },
          ...(userId ? { user_id: { $ne: userId.toString() } } : {}) // Exclude user's own posts
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
      
      // 3. Lookup author details
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
                profile_photo: 1,
                accountStatus: 1
              }
            }
          ],
          as: "authorData"
        }
      },
      
      // 4. Unwind author data into object
      {
        $unwind: {
          path: "$authorData",
          preserveNullAndEmptyArrays: true
        }
      },
      
      // 5. Project fields we need
      {
        $project: {
          _id: 1,
          content: 1,
          date: 1,
          media: 1,
          comments_disabled: 1,
          public_post: 1,
          tagged_users: 1,
          is_edited: 1,
          user_id: 1,
          post_type: 1,
          original_post_id: 1,
          commentsCount: { $size: "$comments" },
          author: {
            _id: "$authorData._id",
            username: "$authorData.user_id",
            firstName: "$authorData.bio.first_name",
            lastName: "$authorData.bio.last_name",
            headline: "$authorData.bio.headline",
            profilePicture: "$authorData.profile_photo",
            accountStatus: "$authorData.accountStatus"
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
    
    // Collect all original post IDs for reposts
    const originalPostIds = new Set<string>();
    completePostsData.forEach(post => {
      if (post.post_type !== postTypeEnum.standard && 
          post.media?.media_type === mediaTypeEnum.post && 
          post.media?.link?.length > 0) {
        originalPostIds.add(post.media.link[0]);
      }
    });
    
    // Fetch all original posts in one query if needed
    const originalPostsMap = new Map();
    if (originalPostIds.size > 0) {
      const originalPosts = await posts.find({
        _id: { $in: Array.from(originalPostIds).map(id => new mongoose.Types.ObjectId(id)) }
      }).lean();
      
      // Create a map for quick lookup
      originalPosts.forEach(post => {
        if (post && post._id) {
          originalPostsMap.set(post._id.toString(), post);
        }
      });
      
      // Get all original post author IDs
      const originalAuthorIds = new Set<string>();
      originalPosts.forEach(post => {
        if (post && post.user_id) {
          originalAuthorIds.add(post.user_id.toString());
        }
      });
      
      // Fetch author information for original posts
      if (originalAuthorIds.size > 0) {
        const originalAuthors = await users.find(
          { _id: { $in: Array.from(originalAuthorIds).map(id => new mongoose.Types.ObjectId(id)) } },
          { 
            _id: 1, 
            user_id: 1, 
            'bio.first_name': 1, 
            'bio.last_name': 1, 
            'bio.headline': 1,
            profile_photo: 1 
          }
        ).lean();
        
        // Add author information to original posts
        originalAuthors.forEach(author => {
          originalPosts.forEach(post => {
            if (post.user_id && post.user_id.toString() === author._id.toString()) {
              (post as any).author = {
                _id: author._id,
                username: author.user_id,
                firstName: author.bio?.first_name || "",
                lastName: author.bio?.last_name || "",
                headline: author.bio?.headline || "",
                profilePicture: author.profile_photo || ""
              };
            }
          });
        });
      }
    }
    
    // Arrange posts according to activity order
    const orderedPosts = [];
    for (const activity of activities) {
      const post = postsMap.get(activity._id.toString());
      if (post && !(userId?.toString() && post.user_id === userId?.toString())) {
        // Add activity type to post
        post.activityType = activity.kind;
        post.actorId = activity.actor;
        
        if (activity.commentId) {
          post.commentId = activity.commentId;
        }
        
        // Handle reposts by attaching original post data
        if ((post.post_type === postTypeEnum.repost_instant || 
             post.post_type === postTypeEnum.repost_thought) && 
            post.original_post_id) {
          const originalPost = originalPostsMap.get(post.original_post_id.toString());
          if (originalPost) {
            post.originalPost = originalPost;
          }
        }
        
        orderedPosts.push(post);
      }
    }
    
    // Get all actor IDs for activities
    const actorIds = new Set<string>();
    orderedPosts.forEach(post => {
      if (post.activityType !== 'post' && post.actorId) {
        actorIds.add(post.actorId.toString());
      }
    });
    
    // Fetch all actor information in one query
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

    // Enhance posts with reactions data and repost data
    const enhancedPosts = await Promise.all(
      orderedPosts.map(async (post) => {
        const isPublicPost = post.public_post === true;
        const isFromConnection = connectionIds.includes(post.user_id.toString());
        
        // Skip this post if it's private and not from a connection
        if (!isPublicPost && !isFromConnection || 
            (post.author?.accountStatus === accountStatusEnum.private && !isFromConnection)) {
          return null; // This post will be filtered out
        }
        
        // Handle tagged users
        if (post.tagged_users && post.tagged_users.length > 0) {
          const userIds = await convert_idIntoUser_id(post.tagged_users);
          if (userIds) {
            post.tagged_users = userIds;
          }
        }
        
        // Initialize reaction variables
        let reactions;
        let userReaction = null;
        let commentsCount = post.commentsCount;
        
        // Handle reactions based on post type
        if (post.post_type === postTypeEnum.repost_instant && post.originalPost) {
          // For instant reposts, get reactions from the original post
          reactions = await getTopReactions(
            post.originalPost._id.toString(),
            targetTypeEnum.post
          );
          
          if (userId) {
            userReaction = await new ReactionRepository().getUserReaction(
              userId,
              post.originalPost._id.toString()
            );
          }
          
          // Use comments count from original post for instant reposts
          commentsCount = post.originalPost.comments?.length || 0;
        } else {
          // For standard posts and thought reposts, get reactions from the post itself
          reactions = await getTopReactions(
            post._id.toString(),
            targetTypeEnum.post
          );
          
          if (userId) {
            userReaction = await new ReactionRepository().getUserReaction(
              userId,
              post._id.toString()
            );
          }
        }
        
        // Add activity context based on type
        let activityContext = null;
        if (post.activityType !== 'post' && post.actorId) {
          const actorInfo = actorMap.get(post.actorId.toString());
          if (actorInfo) {
            activityContext = {
              type: post.activityType,
              actorName: actorInfo.name,
              actorUsername: actorInfo.username,
              actorId: actorInfo.id,
              actorPicture: actorInfo.profilePicture,
            };

            if (post.activityType === 'reaction') {
              // Fetch the actual reaction data
              const reaction = await new ReactionRepository().getUserReaction(
                post.actorId.toString(),
                post._id.toString()
              );
              
              if (reaction) {
                activityContext.type = reaction.reaction;
              }
            }
            
            if (post.activityType === 'comment' && post.commentId) {
              const commentRepository = new CommentRepository();
              const comment = await commentRepository.findById(post.commentId);
              if (comment && activityContext) {
                const plainComment = comment.toObject ? comment.toObject() : comment;
                const topReactions = await getTopReactions(post.commentId, targetTypeEnum.comment);
                const author = await getFormattedAuthor(comment.user_id.toString());
                activityContext = {
                  ...activityContext,
                  comment: {...plainComment, topReactions, author}
                };
              }
            }
          }
        }
        
        // Make sure we have author info
        let author = post.author;
        if ((!author || Object.keys(author).length === 0) && post.user_id) {
          author = await getFormattedAuthor(post.user_id.toString());
        }
        
        // Check if post is saved by user
        let isSaved = false;
        if (userId) {
          const userData = await users.findById(userId, { savedPosts: 1 });
          if (userData && userData.savedPosts) {
            isSaved = userData.savedPosts.some((savedId: any) => 
              savedId.toString() === post._id.toString()
            );
          }
        }
        
        // Remove temp fields
        const { activityType, actorId, commentId, ...cleanPost } = post;
        
        // For reposts, enhance the original post data too
        if ((post.post_type === postTypeEnum.repost_instant || 
             post.post_type === postTypeEnum.repost_thought) && 
            post.originalPost) {
          
          // Make sure we have original author info
          let originalAuthor = post.originalPost.author;
          if ((!originalAuthor || Object.keys(originalAuthor).length === 0) && post.originalPost.user_id) {
            originalAuthor = await getFormattedAuthor(post.originalPost.user_id.toString());
          }
          
          post.originalAuthor = originalAuthor;
          
          // Handle tagged users in original post
          if (post.originalPost.tagged_users && post.originalPost.tagged_users.length > 0) {
            const userIds = await convert_idIntoUser_id(post.originalPost.tagged_users);
            if (userIds) {
              post.originalPost.tagged_users = userIds;
            }
          }
        }
        
        return {
          ...cleanPost,
          author,
          topReactions: reactions?.finalArray || [],
          reactionsCount: reactions?.totalCount || 0,
          commentsCount,
          userReaction: userReaction?.reaction ?? null,
          activityContext,
          isSaved
        };
      })
    );

    const filteredPosts = enhancedPosts.filter(post => post !== null);
    const hasMorePosts = filteredPosts.length > limit;
    const finalPosts = hasMorePosts ? filteredPosts.slice(0, limit) : filteredPosts;
    
    // Calculate next cursor from the last post's date
    const nextCursor = hasMorePosts && finalPosts.length > 0
      ? finalPosts[finalPosts.length - 1].date
      : null;
      
    return { posts: finalPosts, next_cursor:nextCursor };
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Error fetching posts feed: ${err.message}`);
    } else {
      throw new Error("Error fetching posts feed: Unknown error");
    }
  }
};
