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
    mediaType: string | null,
    taggedUsers: string | null) {
      const updateFields: any = {};
      if (content) updateFields.content = content;
      if (mediaLink || mediaType) {
        updateFields.media = {
          link: mediaLink,
          media_type: mediaType,
        };
      }
      if (taggedUsers) updateFields.tagged_users = taggedUsers;
      
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
