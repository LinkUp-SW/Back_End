import { Request, Response } from 'express';
import { findUserByUserId } from '../../utils/database.helper.ts';
import { processPostMediaArray } from '../../services/cloudinary.service.ts';
import { PostRepository } from '../../repositories/posts.repository.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import { mediaTypeEnum, postsInterface, postTypeEnum } from '../../models/posts.model.ts';
import { convertUser_idInto_id } from '../../repositories/user.repository.ts';


/**
 * Create new post under the user
 * Sends the appropriate response if post was created successfully.
 * 
 */


const createPost = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const {
            content,
            mediaType,
            media,
            commentsDisabled,
            publicPost,
            taggedUsers,
            postType,
        } =req.body;
        let userId = await getUserIdFromToken(req,res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        let originalPost;
        if ((!content && !media) || ((!commentsDisabled || publicPost == null) && postType !== postTypeEnum.repost_instant)) {
            return res.status(400).json({ message: 'Required fields missing' });            
        
        }
        
        let processedMedia: string[] | null = null;
        switch (mediaType) {
            case mediaTypeEnum.none:
                processedMedia = null;
                break;
            case mediaTypeEnum.link:
                processedMedia=media;
                break;
            case mediaTypeEnum.post:
                // Verify the original post exists
                originalPost = await new PostRepository().findByPostId(media);
                if (!originalPost) {
                return res.status(404).json({ message: 'Original post not found' });
                }
                processedMedia=media;
                if (!postType) return res.status(400).json({ message: 'postType is required' });
                if (
                  postType === postTypeEnum.repost_instant &&
                  (content || commentsDisabled || publicPost)
                )
                  return res
                    .status(400)
                    .json({ message: "cannot add content to instant reposts" });
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
        const postRepository = new PostRepository;
        console.log(postType)
        const newPost = await postRepository.create(
            user._id!.toString(),
            content,
            processedMedia,
            mediaType,
            commentsDisabled,
            publicPost,
            postType,
            converted_id
        );
        await newPost.save();
        
        if(!(postType === postTypeEnum.standard) && originalPost){
            originalPost.reposts = originalPost.reposts || [];
            originalPost.reposts.push(newPost._id as postsInterface);
            await originalPost.save();
            user.activity.reposted_posts.push(newPost);
        }else{
            user.activity.posts.push(newPost);
        }
        await user.save();
        return res.status(200).json({message:'Post successfully created', postId:newPost._id,postType })
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