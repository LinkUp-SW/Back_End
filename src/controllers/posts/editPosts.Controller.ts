import { Request, Response } from 'express';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { CustomError } from '../../utils/customError.utils.ts';
import { processMediaArray, processPostMediaArray } from '../../services/cloudinary.service.ts';
import { PostRepository } from '../../repositories/posts.repository.ts';


const editPost = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const {
            postId,
            content,
            mediaType,
            media,
            taggedUsers
        } =req.body;
        if (!postId){
            return res.status(400).json({message:'postId is required ' })
        }
        let processedMedia: string[] | null = null;
        if (media){
            const mediaArray = await processPostMediaArray(media);
            processedMedia = mediaArray ? mediaArray.filter((item): item is string => item !== undefined) : null;
            console.log(processedMedia);
        }
        const postRepository = new PostRepository;
        const post= await postRepository.findByPostId(postId);
        if (!post){
            return res.status(400).json({message:'Post does not exist ' })
        }
        const updatePost = await postRepository.update(
            postId,
            content,
            processedMedia,
            mediaType,
            taggedUsers
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
