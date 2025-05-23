import { Request, Response } from 'express';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { PostRepository } from '../../repositories/posts.repository.ts';
import { deleteAllComments } from '../../repositories/comment.repository.ts';
import { deleteAllPostReactions, deleteCommentReactions } from '../../repositories/reacts.repository.ts';
import { postTypeEnum } from '../../models/posts.model.ts';
import { contentTypeEnum, Report } from '../../models/reports.model.ts';


/**
 * delete post under the user
 * Sends the appropriate response if post was deleted successfully.
 * 
 */


const deletePost = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const postId = req.params.postId;
        const userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        if (!postId){
            return res.status(400).json({message:'Required fields missing' })
        }
        const postRepository = new PostRepository;
        const post = await postRepository.findByPostId(postId);
        if (!post){
            return res.status(400).json({message:'Post does not exist ' })
        }
        await deleteAllPostReactions(postId);
        await deleteAllComments(postId);
        await Report.deleteMany({ 
            content_ref: postId,
            content_type: contentTypeEnum.Post 
        });
        if(post.reposts){
            const repostIds = post.reposts.map(repost => repost.toString());
            await postRepository.deleteAllRepostsOfPost(repostIds);
            if (repostIds.length > 0) {
                await Report.deleteMany({
                    content_ref: { $in: repostIds },
                    content_type: contentTypeEnum.Post
                });
            }
        }
        // remove post from the user
        user.activity.posts = user.activity.posts.filter((userPost) => userPost.toString() !== postId);
        if (post.post_type !== postTypeEnum.standard){
            const originalPost = await postRepository.findByPostId(post.media.link[0]);
            if (originalPost){
                originalPost.reposts = originalPost.reposts!.filter((userPost) => userPost.toString() !== postId);
                await originalPost.save();
            }

        }

        // Save the updated user
        await user.save();
        await postRepository.deletepost(postId);
        return res.status(200).json({message:'Post successfully deleted' })
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message,success:false });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
};

export {deletePost};