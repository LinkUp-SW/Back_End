import { Request, Response } from 'express';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { CustomError } from '../../utils/customError.utils.ts';
import { processMediaArray, processPostMediaArray } from '../../services/cloudinary.service.ts';
import { PostRepository } from '../../repositories/posts.repository.ts';


/**
 * Create new post under the user
 * Sends the appropriate response if post was created successfully.
 * 
 */


const createPost = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const {
            userId,
            content,
            mediaType,
            media,
            commentsDisabled,
            publicPost,
            taggedUsers
        } =req.body;
        if (!userId || !content || !commentsDisabled || publicPost == null || publicPost === undefined || !taggedUsers){
            return res.status(400).json({message:'Required fields missing' })
        }
        let processedMedia: string[] | null = null;
        if (media){
            const mediaArray = await processPostMediaArray(media);
            processedMedia = mediaArray ? mediaArray.filter((item): item is string => item !== undefined) : null;
        }
        const user= await findUserByUserId(userId,res);
        if (!user){
            throw new CustomError('User not found',404);
        }
        const postRepository = new PostRepository;
        const newPost = await postRepository.create(
            userId,
            content,
            processedMedia,
            mediaType,
            commentsDisabled,
            publicPost,
            taggedUsers
        );
        await newPost.save();
        user.activity.posts.push(newPost);
        await user.save();
        return res.status(200).json({message:'Post successfully created' })
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message,success:false });
        }
        else{
            res.status(500).json({ message: 'Server error', error });
    
        }
    }
};

export {createPost};