import posts from "../models/posts.model.ts";
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
 * Fetches paginated posts for a user using cursor-based pagination.
 * @param userId - The user ID to fetch posts for.
 * @param cursor - The cursor to start fetching posts from (e.g., date or _id).
 * @returns An object containing the posts and the next cursor, if available.
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