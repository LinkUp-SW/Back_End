import { Request, Response, NextFunction } from 'express';
import { PostRepository } from '../../repositories/posts.repository.ts';
import { processPostMediaArray } from '../../services/cloudinary.service.ts';
import { mediaTypeEnum, postTypeEnum, commentsEnum } from '../../models/posts.model.ts';
import { convertUser_idInto_id } from '../../repositories/user.repository.ts';
import organizations from '../../models/organizations.model.ts';
import { 
    getCompanyProfileById, 
    validateUserIsCompanyAdmin, 
    validateTokenAndGetUser,
    formatCompanyPosts 
} from '../../utils/helper.ts';

/**
 * Create a new post for a company
**/
export const createPostFromCompany = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        const { organization_id } = req.params;

        const {
            content,
            mediaType,
            media,
            commentsDisabled,
            publicPost,
            taggedUsers
        } = req.body;
        
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;
        
        // Validate required fields
        if (!content && !media) {
            return res.status(400).json({ message: 'Content or media is required' });
        }
        
        // Process media based on type
        let processedMedia: string[] | null = null;
        switch (mediaType) {
            case mediaTypeEnum.none:
                processedMedia = null;
                break;
            case mediaTypeEnum.link:
                processedMedia = media;
                break;
            default:
                if (media) {
                    const mediaArray = await processPostMediaArray(media);
                    processedMedia = mediaArray ? mediaArray.filter((item): item is string => item !== undefined) : null;
                }
                break;
        }
        
        // Convert tagged users if present
        let convertedTaggedUsers;
        if (taggedUsers) {
            convertedTaggedUsers = await convertUser_idInto_id(taggedUsers);
        }
        
        // Create the post using organization ID as the user_id
        const postRepository = new PostRepository();
        const newPost = await postRepository.create(
            organization_id, 
            content,
            processedMedia,
            mediaType,
            commentsDisabled,
            publicPost,
            postTypeEnum.standard, // Company posts are standard type
            convertedTaggedUsers
        );
        
        // Mark as company post
        newPost.is_company = true;
        newPost.company = organization;
        await newPost.save();
        
        // Add the post to the organization's posts array
        organization.posts.push(newPost);
        await organization.save();
        
        return res.status(201).json({ 
            message: 'Company post successfully created', 
            postId: newPost._id 
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message, success: false });
        } else {
            return res.status(500).json({ message: 'Server error', error });
        }
    }
};

/**
 * Edit an existing company post
 */
export const editPostFromCompany = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        const organizationId = req.params.organization_id;
        const postId = req.params.post_id;
        const {
            content,
            mediaType,
            media,
            commentsDisabled,
            publicPost,
            taggedUsers
        } = req.body;
        
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organizationId, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;
        
        // Validate post ID
        if (!postId) {
            return res.status(400).json({ message: 'Post ID is required' });
        }
        
        // Find the post
        const postRepository = new PostRepository();
        const post = await postRepository.findByPostId(postId);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Verify the post belongs to this organization
        if (post.user_id !== organizationId) {
            return res.status(403).json({ message: 'This post does not belong to the specified organization' });
        }
        
        // Process media based on type
        let processedMedia: string[] | null = null;
        switch (mediaType) {
            case mediaTypeEnum.none:
                processedMedia = null;
                break;
            case mediaTypeEnum.link:
                processedMedia = media;
                break;
            default:
                if (media) {
                    const mediaArray = await processPostMediaArray(media);
                    processedMedia = mediaArray ? mediaArray.filter((item): item is string => item !== undefined) : null;
                }
                break;
        }
        
        // Convert tagged users if present
        let convertedTaggedUsers;
        if (taggedUsers) {
            convertedTaggedUsers = await convertUser_idInto_id(taggedUsers);
        }
        
        // Update the post
        const updatedPost = await postRepository.update(
            postId,
            content,
            processedMedia,
            mediaType,
            commentsDisabled,
            publicPost,
            convertedTaggedUsers
        );
        
        if (updatedPost) {
            updatedPost.is_edited = true;
            await updatedPost.save();
        }
        
        return res.status(200).json({ message: 'Company post successfully updated' });
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message, success: false });
        } else {
            return res.status(500).json({ message: 'Server error', error });
        }
    }
};

/**
 * Delete a company post
 */
export const deletePostFromCompany = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        const organizationId = req.params.organization_id;
        const postId = req.params.post_id;
        
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organizationId, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;
        
        // Validate post ID
        if (!postId) {
            return res.status(400).json({ message: 'Post ID is required' });
        }
        
        // Find the post
        const postRepository = new PostRepository();
        const post = await postRepository.findByPostId(postId);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Verify the post belongs to this organization
        if (post.user_id !== organizationId) {
            return res.status(403).json({ message: 'This post does not belong to the specified organization' });
        }
        
        // Delete reactions and comments
        const { deleteAllPostReactions } = await import('../../repositories/reacts.repository.ts');
        const { deleteAllComments } = await import('../../repositories/comment.repository.ts');
        
        await deleteAllPostReactions(postId);
        await deleteAllComments(postId);
        
        // Handle reposts if any
        if (post.reposts && post.reposts.length > 0) {
            const repostIds = post.reposts.map(repost => repost.toString());
            await postRepository.deleteAllRepostsOfPost(repostIds);
        }
        
        // Remove post from organization's posts array
        organization.posts = organization.posts.filter(
            (orgPost) => orgPost.toString() !== postId
        );
        await organization.save();
        
        // Delete the post
        await postRepository.deletepost(postId);
        
        return res.status(200).json({ message: 'Company post successfully deleted' });
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message, success: false });
        } else {
            return res.status(500).json({ message: 'Server error', error });
        }
    }
};

/**
 * Get all posts from a company
 */
export const getCompanyPosts = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        const organizationId = req.params.organization_id;
        const userId = await getUserIdFromToken(req, res);
        if (!userId) return;
        
        const user = await findUserByUserId(userId, res);
        if (!user) return;
        // Validate organization ID
        if (!organizationId) {
            return res.status(400).json({ message: 'Organization ID is required' });
        }
        
        // Find the organization and populate its posts
        const organization = await organizations.findById(organizationId)
            .populate({
                path: 'posts',
                options: { sort: { date: -1 } }, // Sort by date descending (newest first)
                populate: [
                    { 
                        path: 'comments',
                        populate: {
                            path: 'user_id',
                            select: 'first_name last_name profile_picture'
                        } 
                    },
                    { 
                        path: 'reacts',
                        populate: {
                            path: 'user_id',
                            select: 'first_name last_name profile_picture'
                        }
                    }
                ]
            });
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        
        // Use the helper function to format posts
        const formattedPosts = formatCompanyPosts(organization.posts, organization, user._id as string);
        
        return res.status(200).json({
            message: 'Company posts retrieved successfully',
            posts: formattedPosts,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
};