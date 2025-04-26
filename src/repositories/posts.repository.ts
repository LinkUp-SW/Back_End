import mongoose from "mongoose";
import posts from "../models/posts.model.ts";
import users from "../models/users.model.ts";

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

