import posts from "../models/posts.model.ts";
import comments, { commentsInterface } from "../models/comments.model.ts";

export class PostRepository {
  async create(
    userId: string,
    content: string,
    mediaLink: string[] | null,
    mediaType: string | null,
    commentsDisabled: string | null,
    publicPost: boolean | null,
    taggedUsers: string | null
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
    taggedUsers: string | null,
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
    if (taggedUsers!== null) updateFields.tagged_users = taggedUsers;
    
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
 * @returns Promise containing the posts and the next cursor position
 */
export const getSavedPostsCursorBased = async (
  savedPosts: string[],
  cursor: number | null, // Cursor to track the current position
  limit: number
): Promise<{ posts: any[]; nextCursor: number | null }> => {
  if (!savedPosts || savedPosts.length === 0) {
    return { posts: [], nextCursor: null }; // Return an empty result if no saved jobs exist
  }
  const postsData: any[] = []; // Array to store fetched posts
  if (cursor == null) cursor = 0
  const end = Math.min(cursor + limit, savedPosts.length); // Calculate the end index based on the limit

  for (let i = cursor; i < end; i++) {
    if (i >= savedPosts.length) {
      break; // Exit the loop if the array finishes mid-processing
    }
    const postId = savedPosts[i];
    const post = await posts.findOne({ _id: postId }); // Fetch the post by ID
    if (post) {
      postsData.push(post); // Add the post to the postsData array
    }
  }

  // Determine the next cursor
  const hasNextPage = end < savedPosts.length; // Check if there are more posts to fetch
  const nextCursor = hasNextPage ? end : null; // Set the next cursor or null if no more posts

  return { posts: postsData, nextCursor }
};

/**
 * Fetches paginated comments for a post with their direct replies
 * @param cursor - The position to start fetching root comments from
 * @param limit - Maximum number of root comments to fetch
 * @param postId - The ID of the post to fetch comments for
 * @returns Promise containing the comments, count, and pagination info
 */
export const getComments = async (
  cursor: number = 0,
  limit: number = 10,
  postId: string
): Promise<{ count: number; comments: any; nextCursor: number | null }> => {
  try {
    // First, fetch all root comments (comments without a parent)
    const rootComments = await comments
      .find({ post_id: postId, parentId: { $exists: false } })
      .sort({ date: 1 })
      .skip(cursor)
      .limit(limit)
      .lean()
      .exec();
    
    // Create a result object with root comments as keys
    const result: Record<string, any> = {};
    
    // Process each root comment
    for (const rootComment of rootComments) {
      const rootId = rootComment._id.toString();
      
      // Find all direct replies to this root comment
      const replies = await comments
        .find({ parentId: rootId })
        .sort({ date: 1 })
        .lean()
        .exec();
      
      // Add the root comment with its replies to the result
      result[rootId] = {
        ...rootComment,
        children: replies.reduce((acc: Record<string, any>, reply) => {
          acc[reply._id.toString()] = { ...reply, children: {} };
          return acc;
        }, {})
      };
    }
    
    // Count total root comments for pagination
    const totalRootComments = await comments.countDocuments({ 
      post_id: postId, 
      parentId: { $exists: false } 
    });
    
    // Determine if there are more comments
    const hasNextPage = cursor + rootComments.length < totalRootComments;
    const nextCursor = hasNextPage ? cursor + limit : null;
    
    return {
      count: rootComments.length,
      comments: result,
      nextCursor: nextCursor
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