import { Request, Response } from 'express';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { PostRepository } from '../../repositories/posts.repository.ts';
import { getTopReactions } from '../../repositories/reacts.repository.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import users from '../../models/users.model.ts';
import { getComments } from '../../repositories/comment.repository.ts';
import { convert_idIntoUser_id } from '../../repositories/user.repository.ts';
import { targetTypeEnum } from '../../models/reactions.model.ts';



const getPost = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const postId = req.params.postId;
        const cursor = parseInt(req.query.cursor as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        const replyLimit = req.query.replyLimit !== undefined ? 
            parseInt(req.query.replyLimit as string) : 2;
        let userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        const postsRepository = new PostRepository();
        const post = await postsRepository.findByPostId(postId);
        if (!post){
            return res.status(404).json({message:'Post not found' });
        }
        const postAuthor = await users.findById(post.user_id).lean();
        if (!postAuthor) {
            return res.status(404).json({message: 'Post author not found'});
        }
        const authorInfo = {
            username: postAuthor.user_id,
            firstName: postAuthor.bio.first_name,
            lastName: postAuthor.bio.last_name,
            headline:postAuthor.bio.headline,
            profilePicture: postAuthor.profile_photo,
            connectionDegree:"3rd+"
        };
        const result = await getComments(cursor, limit, postId,replyLimit);
        const plainPost = post.toObject ? post.toObject() : post;
        if (plainPost.tagged_users && plainPost.tagged_users.length > 0) {
            const userIds = await convert_idIntoUser_id(plainPost.tagged_users);
            if (userIds) {
                plainPost.tagged_users = userIds;
            }
        }
        const isSaved = user.savedPosts.some(savedPostId => 
            savedPostId.toString() === postId
          );        
        const reactions = await getTopReactions(postId, targetTypeEnum.post);
          return res.status(200).json({message:'Post returned successfully',post:{...plainPost, author:authorInfo,isSaved,reactions: reactions.topReacts,reactionsCount: reactions.totalCount},comments:result })
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
}; 

export {getPost};