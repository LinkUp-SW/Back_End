import { NextFunction, Request, Response } from "express";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import { getCompanyProfileById, validateUserIsCompanyAdmin } from "../../utils/helper.ts";
import organizations from "../../models/organizations.model.ts";
import { PostRepository } from "../../repositories/posts.repository.ts";
import { processPostMediaArray } from "../../services/cloudinary.service.ts";
import { mediaTypeEnum } from "../../models/posts.model.ts";

/**
 * Create a new post for a company
 */
export const createPostFromCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { user_id: string, _id: string };
        if (!user) return;

        const { organization_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;

        const {
            content,
            mediaType,
            media,
            commentsDisabled,
            publicPost,
            taggedUsers
        } = req.body;

        // Validate required fields
        if ((!content && !media) || commentsDisabled === undefined || publicPost === undefined) {
            res.status(400).json({ message: 'Required fields missing' });
            return;
        }

        // Process media based on media type
        let processedMedia: string[] | null = null;
        switch (mediaType) {
            case mediaTypeEnum.none:
                processedMedia = null;
                break;
            case mediaTypeEnum.link:
                processedMedia = media;
                break;
            case mediaTypeEnum.post:
                processedMedia = media;
                break;
            default:
                if (media) {
                    const mediaArray = await processPostMediaArray(media);
                    processedMedia = mediaArray ? mediaArray.filter((item): item is string => item !== undefined) : null;
                }
                break;
        }

        // Create post using repository
        const postRepository = new PostRepository();
        const newPost = await postRepository.create(
            user.user_id,
            content,
            processedMedia,
            mediaType,
            commentsDisabled,
            publicPost,
            taggedUsers,
            organization
        );
        
        await newPost.save();
        
        // Add post to organization's posts array
        organization.posts.push(newPost);
        await organization.save();

        res.status(201).json({ 
            message: 'Post successfully created for company', 
            postId: newPost._id,
            organizationName: organization.name
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update an existing company post
 */
export const editPostFromCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { organization_id, post_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;

        // Validate post belongs to organization
        if (!organization.posts.some(postId => postId.toString() === post_id)) {
            res.status(404).json({ message: "Post not found or doesn't belong to this organization" });
            return;
        }

        const {
            content,
            mediaType,
            media,
            commentsDisabled,
            publicPost,
            taggedUsers
        } = req.body;

        // Validate post exists
        const postRepository = new PostRepository();
        const post = await postRepository.findByPostId(post_id);
        if (!post) {
            res.status(404).json({ message: 'Post does not exist' });
            return;
        }

        // Process media based on media type
        let processedMedia: string[] | null = null;
        switch (mediaType) {
            case mediaTypeEnum.none:
                processedMedia = null;
                break;
            case mediaTypeEnum.link:
                processedMedia = media;
                break;
            case mediaTypeEnum.post:
                processedMedia = media;
                break;
            default:
                if (media) {
                    const mediaArray = await processPostMediaArray(media);
                    processedMedia = mediaArray ? mediaArray.filter((item): item is string => item !== undefined) : null;
                }
                break;
        }

        // Update the post
        const updatedPost = await postRepository.update(
            post_id,
            content,
            processedMedia,
            mediaType,
            commentsDisabled,
            publicPost,
            taggedUsers
        );
        
        if (updatedPost) {
            await updatedPost.save();
        }

        res.status(200).json({ 
            message: 'Post successfully updated', 
            postId: post_id,
            organizationName: organization.name
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete an existing company post
 */
export const deletePostFromCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { organization_id, post_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;

        // Validate post belongs to organization
        const postIndex = organization.posts.findIndex(postId => postId.toString() === post_id);
        if (postIndex === -1) {
            res.status(404).json({ message: "Post not found or doesn't belong to this organization" });
            return;
        }

        // Validate post exists
        const postRepository = new PostRepository();
        const post = await postRepository.findByPostId(post_id);
        if (!post) {
            res.status(404).json({ message: 'Post does not exist' });
            return;
        }

        // Remove post from organization's posts array
        organization.posts.splice(postIndex, 1);
        await organization.save();

        // Delete the post
        await postRepository.deletepost(post_id);

        res.status(200).json({ 
            message: 'Post successfully deleted', 
            postId: post_id,
            organizationName: organization.name
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all posts for a company
 */
export const getCompanyPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { organization_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Get pagination parameters
        const limit = parseInt(req.query.limit as string) || 10;
        const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : null;
        
        // Optional filter for only public posts if viewer is not logged in or not an admin
        let onlyPublicPosts = true;
        
        if (req.headers.authorization) {
            try {
                const user = await validateTokenAndGetUser(req, res) as { _id: string };
                if (user) {
                    const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
                    if (isAdmin) {
                        onlyPublicPosts = false; // Admin can see all posts
                    }
                }
            } catch (error) {
                // If token validation fails, default to public posts only
            }
        }
        
        // Get the organization with populated posts
        const populatedOrg = await organizations.findById(organization_id)
            .populate({
                path: 'posts',
                options: { 
                    sort: { createdAt: -1 },
                    ...(onlyPublicPosts && { match: { public_post: true } })
                }
            });
            
        if (!populatedOrg) {
            res.status(404).json({ message: "Organization not found" });
            return;
        }
        
        // Extract posts from the populated organization
        const allPosts = populatedOrg.posts || [];
        
        // Apply cursor-based pagination
        let startIndex = 0;
        if (cursor !== null) {
            startIndex = cursor;
        }
        
        const endIndex = Math.min(startIndex + limit, allPosts.length);
        const posts = allPosts.slice(startIndex, endIndex);
        
        // Determine the next cursor
        const nextCursor = endIndex < allPosts.length ? endIndex : null;
        
        res.status(200).json({
            organization: {
                id: populatedOrg._id,
                name: populatedOrg.name,
                logo: populatedOrg.logo
            },
            posts,
            count: posts.length,
            total: allPosts.length,
            nextCursor
        });
    } catch (error) {
        next(error);
    }
};