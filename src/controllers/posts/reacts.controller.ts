import { Request, Response } from 'express';
import { findUserByUserId } from '../../utils/database.helper.ts';
import {PostRepository } from '../../repositories/posts.repository.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import { targetTypeEnum } from '../../models/reactions.model.ts';
import comments from '../../models/comments.model.ts';
import { getPaginatedReactions, getTopReactions, ReactionRepository } from '../../repositories/reacts.repository.ts';
import posts, { postTypeEnum } from '../../models/posts.model.ts';
import users from '../../models/users.model.ts';



export const reactOnPost = async (req: Request, res: Response): Promise<Response | void> =>{
    try {
        const post_id = req.params.postId;
        const {
            comment_id,
            target_type,
            reaction
        }=req.body
        let userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        if (!post_id || !target_type || !reaction){
            return res.status(400).json({message:'Required fields missing' });
        }
        const postRepository = new PostRepository();
        let post = await postRepository.findByPostId(post_id);
        if (!post){
            return res.status(404).json({message:'Post not found' });
        }
        if (post.post_type===postTypeEnum.repost_instant){
            const orignalPost = await postRepository.findByPostId(post.media.link[0]);
            if (orignalPost) post=orignalPost;
            else return res.status(404).json({ message: 'Original post does not exist' });
        }
        const reactionRepository = new ReactionRepository();
        let target: any;
        switch(target_type){
            case targetTypeEnum.comment:
                const comment = await comments.findById(comment_id);
                if (!comment) {
                    return res.status(404).json({ error: "Comment does not exist" });
                }
                target = comment;
                break;
            case targetTypeEnum.post:
                target = post;
                break;
            default:
                return res.status(400).json({ error: "Invalid target type" });
        }
        const react = await reactionRepository.addReaction(
            user._id!.toString(),
            target._id,
            target_type,
            reaction
        );
        await react.reaction.save();
        if(!react.wasUpdated){
            target.reacts.push(react.reaction);
            target.save();
            user.activity.reacts.push(react.reaction);
            user.save();
    }
            
        const { finalArray, totalCount } = await getTopReactions(target._id, target_type);
        return res.status(200).json({
        message: 'Reaction added successfully',
        reaction: react,
        top_reactions: finalArray,
        reactions_count: totalCount
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
}; 

export const removeReaction = async (req: Request, res: Response): Promise<Response | void> => {
    try{
        const post_id = req.params.postId;
        const {
            comment_id,
            target_type,
        }=req.body
        let userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        if (!post_id || !target_type){
            return res.status(400).json({message:'Required fields missing' });
        }
        const postRepository = new PostRepository();
        let post = await postRepository.findByPostId(post_id);
        if (!post){
            return res.status(404).json({message:'Post not found' });
        }
        if (post.post_type===postTypeEnum.repost_instant){
            const orignalPost = await postRepository.findByPostId(post.media.link[0]);
            if (orignalPost) post=orignalPost;
            else return res.status(404).json({ message: 'Original post does not exist' });
        }
        const reactionRepository = new ReactionRepository();
        let target: any;
        switch(target_type){
            case targetTypeEnum.comment:
                const comment = await comments.findById(comment_id);
                if (!comment) {
                    return res.status(404).json({ error: "Comment does not exist" });
                }
                target = comment;
                break;
            case targetTypeEnum.post:
                target = post;
                break;
            default:
                return res.status(400).json({ error: "Invalid target type" });
    }
    const removedReact = await reactionRepository.removeReaction(user._id as string,target._id);
    if (removedReact){
        switch(target_type){
            case targetTypeEnum.comment:
                await comments.updateOne(
                    { _id: comment_id },
                    { $pull: { reacts: removedReact._id } }
                );
                break;
            case targetTypeEnum.post:
                await posts.updateOne(
                    { _id: target._id },
                    { $pull: { reacts: removedReact._id } }
                );
                break;
            default:
                return res.status(400).json({ error: "Invalid target type" });
    }
    await users.updateOne(
        { _id: user._id },
        { $pull: { "activity.reacts": removedReact._id } }
    );
    }
    const { finalArray, totalCount } = await getTopReactions(target._id, target_type);
    return res.status(200).json({
        message: 'Reaction removed successfully',
        reaction: removedReact,
        top_reactions: finalArray,
        reactions_count: totalCount
        }); 
    }catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
};

  
// Get reactions for a post/comment
export const getReactionsForTarget = async (req: Request, res: Response): Promise<Response | void> => {
   try{
    const post_id = req.params.postId;
    const comment_id = req.query.commentId as string;
    const cursor = parseInt(req.query.cursor as string) || 0;
    const limit = parseInt(req.query.limit as string);
    const target_type = req.query.targetType as string;
    const specificReaction = req.query.specificReaction as string;
    let userId = await getUserIdFromToken(req,res);
    if (!userId) return;
    const user = await findUserByUserId(userId,res);
    if (!user) return;
    if (!post_id || !target_type || !limit){
        return res.status(400).json({message:'Required fields missing' });
    }
    const postRepository = new PostRepository();
    let post = await postRepository.findByPostId(post_id);
    if (!post){
        return res.status(404).json({message:'Post not found' });
    }
    if (post.post_type===postTypeEnum.repost_instant){
        const orignalPost = await postRepository.findByPostId(post.media.link[0]);
        if (orignalPost) post=orignalPost;
        else return res.status(404).json({ message: 'Original post does not exist' });
    }
    let targetId: string;
    switch(target_type){
        case targetTypeEnum.comment:
            const comment = await comments.findById(comment_id);
            if (!comment) {
                return res.status(404).json({ error: "Comment does not exist" });
            }
            targetId = comment_id;
            break;
        case targetTypeEnum.post:
            targetId = post_id;
            break;
        default:
            return res.status(400).json({ error: "Invalid target type" });
    }
    const result = await getPaginatedReactions(targetId,target_type,cursor,limit,specificReaction)

    return res.status(200).json({message:'reactions successfully retrieved',reactions:result })
}catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
        return res.status(401).json({ message: error.message });
    }
    else{
        res.status(500).json({ message: 'Server error', error });

    }
}
}
