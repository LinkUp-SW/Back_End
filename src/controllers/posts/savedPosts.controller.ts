import { Request, Response } from 'express';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { enhancePosts, getPostsFromPostIdsCursorBased, PostRepository } from '../../repositories/posts.repository.ts';
import { postsInterface } from '../../models/posts.model.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';

/**
 * save post under the user
 * Sends the appropriate response if post was saved successfully.
 * 
 */


const savePost = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const {
            postId
        } =req.body;
        if (!postId){
            return res.status(400).json({message:'Required fields missing' })
        }
        let userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        const postRepository = new PostRepository;
        const post = await postRepository.findByPostId(postId);
        if (!post){
            return res.status(404).json({message:'Post does not exist ' })
        }
        // add saved post to the user
        user.saved_posts.push(postId);

        // Save the updated user
        await user.save();
        return res.status(200).json({message:'Post successfully saved for user' })
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message,success:false });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
};
/**
 * Display the saved posts under
 * Sends the posts in batches and the index to start the next batch from
 * 
 */
const displaySavedPosts = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const cursor = parseInt(req.query.cursor as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;
        if (!limit ){
            return res.status(400).json({message:'Required fields missing' })
        }
        let userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        const savedPosts = [...user.saved_posts].reverse().map((post: postsInterface) => post._id);
        const { posts: postsData, next_cursor } = await getPostsFromPostIdsCursorBased(savedPosts as string[], cursor, limit);
        const enhancedPosts = await enhancePosts(postsData, user._id!.toString(), user.saved_posts);
        return res.status(200).json({message:'Posts returned successfully',posts:enhancedPosts,next_cursor:next_cursor })
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message,success:false });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
}; 


/**
 * delete saved post under the user
 * Sends the appropriate response if saved post was deleted successfully.
 * 
 */

const deleteSavedPost = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const {
            postId
        } =req.body;
        if (!postId ){
            return res.status(400).json({message:'Required fields missing' })
        }
        let userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        const postRepository = new PostRepository;
        const post = await postRepository.findByPostId(postId);
        if (!post){
            return res.status(404).json({message:'Post does not exist ' })
        }
         // Remove the post from the savedPosts array using filter
         user.saved_posts = user.saved_posts.filter(savedPostId => savedPostId.toString() !== postId);
         await user.save();
         return res.status(200).json({message:'Deleted saved post successfully for user' })
} catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message,success:false });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
}; 

export {savePost,displaySavedPosts,deleteSavedPost};