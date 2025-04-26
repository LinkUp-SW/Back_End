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
  const userIds = new Set<string>();
  for (let i = cursor; i < end; i++) {
    if (i >= savedPosts.length) {
      break; // Exit the loop if the array finishes mid-processing
    }
    const postId = savedPosts[i];
    const post = await posts.findOne({ _id: postId }); // Fetch the post by ID
    if (post) {
      postsData.push(post); // Add the post to the postsData array
      userIds.add(post.user_id.toString());
    }
  }
  
  const authors = await users.find({_id:{$in: Array.from(userIds) } }).lean();
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
  const enrichedPosts = postsData.map(post => {
  const authorInfo = authorMap.get(post.user_id.toString());
  const plainPost = post.toObject ? post.toObject() : post;
  return {
    ...plainPost,
    author: authorInfo || null
  };
});
  // Determine the next cursor
  const hasNextPage = end < savedPosts.length; // Check if there are more posts to fetch
  const nextCursor = hasNextPage ? end : null; // Set the next cursor or null if no more posts

  return { posts: enrichedPosts, nextCursor }
};

