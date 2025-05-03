import { Request, Response } from 'express';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { processPostMediaArray } from '../../services/cloudinary.service.ts';
import { PostRepository } from '../../repositories/posts.repository.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import { mediaTypeEnum, postTypeEnum } from '../../models/posts.model.ts';
import { convertUser_idInto_id } from '../../repositories/user.repository.ts';


const editPost = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const postId = req.params.postId;
        const {
            content,
            mediaType,
            media,
            commentsDisabled,
            publicPost,
            taggedUsers
        } =req.body;
        const userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        if (!postId){
            return res.status(400).json({message:'postId is required ' })
        }
        const postRepository = new PostRepository;
        const post= await postRepository.findByPostId(postId);
        if (!post){
            return res.status(400).json({message:'Post does not exist ' })
        }
        if (post.user_id.toString() !== user._id!.toString()) {
            return res.status(403).json({ message: 'Not authorized to edit this post' });
        }
        
        if (post.post_type !== postTypeEnum.standard) {
            // For reposts, limit what can be edited
            // For thought reposts: allow content editing but not media
            if (post.post_type === postTypeEnum.repost_thought) {
                if (media || mediaType) {
                    return res.status(400).json({ 
                        message: 'Cannot edit media for repost with thoughts' 
                    });
                }
            }
            // For instant reposts: more restrictions - only visibility settings
            else if (post.post_type === postTypeEnum.repost_instant) {
                if (content || media || mediaType) {
                    return res.status(400).json({ 
                        message: 'Cannot edit content or media for instant reposts' 
                    });
                }
            }
        }
        
        let processedMedia: string[] | null = null;
        switch (mediaType) {
            case mediaTypeEnum.none:
                processedMedia = null;
                break;
            case mediaTypeEnum.link:
                processedMedia=media;
                break;
            default:
                if (media) {
                    const mediaArray = await processPostMediaArray(media);
                    processedMedia = mediaArray ? mediaArray.filter((item): item is string => item !== undefined) : null;
                }
                break;
                }
        let converted_id;
        if (taggedUsers)
            { converted_id = await convertUser_idInto_id(taggedUsers);}
        const updatePost = await postRepository.update(
            postId,
            content,
            processedMedia,
            mediaType,
            commentsDisabled,
            publicPost,
            converted_id
        );
        if (updatePost){await updatePost.save();}
        return res.status(200).json({message:'Post successfully updated' })
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message,success:false });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
};

export {editPost};
