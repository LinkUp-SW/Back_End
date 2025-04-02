import { Request, Response } from 'express';
import { getUserIdFromToken } from '../../utils/helper.ts';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { CustomError } from '../../utils/customError.utils.ts';
import { processMediaArray } from '../../services/cloudinary.service.ts';
import { PostRepository } from '../../repositories/posts.repository.ts';


/**
 * delete post under the user
 * Sends the appropriate response if post was deleted successfully.
 * 
 */


const deletePost = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const {
            postId
        } =req.body;
        if (!postId){
            return res.status(400).json({message:'Required fields missing' })
        }
        const postRepository = new PostRepository;
        const post = await postRepository.findByPostId(postId);
        if (!post){
            return res.status(400).json({message:'Post does not exist ' })
        }
        const user = await findUserByUserId(post.user_id, res);
        if (!user) {
            throw new CustomError('User not found', 404);
        }
        // remove post from the user
        user.activity.posts = user.activity.posts.filter((userPost) => userPost.toString() !== postId);

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