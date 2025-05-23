import { NextFunction, Request, Response } from "express";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import organizations from "../../models/organizations.model.ts";
import users, { usersInterface } from "../../models/users.model.ts"; // Add this import
import { getCompanyProfileById, validateUserIsCompanyAdmin } from "../../utils/helper.ts";
import mongoose from "mongoose"; // Import mongoose
import jobs from "../../models/jobs.model.ts"; // Import jobs model

export const makeAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { organization_id, user_id } = req.params;

        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;
        
        // Get the organization
        const organizationData = await organizations.findById(organization_id);
        if (!organizationData) {
            res.status(404).json({ message: "Organization not found" });
            return;
        }
        
        // Check if user is already an admin
        const isAlreadyAdmin = organizationData.admins.some(
            (adminId: any) => adminId.toString() === user_id
        );
        
        if (isAlreadyAdmin) {
            res.status(400).json({ message: "User is already an admin" });
            return;
        }
        
        // Get the user to make admin
        const userToMakeAdmin = await users.findById(user_id);
        if (!userToMakeAdmin) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        
        // Add user ID to admins list
        organizationData.admins.push(userToMakeAdmin);
        
        // Add organization to user's organizations list        
        userToMakeAdmin.organizations.push(organizationData);
        await userToMakeAdmin.save();
        
        
        await organizationData.save();

        res.status(200).json({ 
            message: "User made admin successfully", 
            organization: {
                admins: organizationData.admins,
            }
        });
    } catch (error) {
        next(error);
    }
}

export const removeAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { organization_id, user_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;
        
        // Get the organization
        const organizationData = await organizations.findById(organization_id);
        if (!organizationData) {
            res.status(404).json({ message: "Organization not found" });
            return;
        }
        
        // Prevent removing yourself
        if (user_id === user._id.toString()) {
            res.status(400).json({ message: "Cannot remove yourself as admin" });
            return;
        }
        
        // Check if admin to be removed exists
        const adminIndex = organizationData.admins.findIndex(
            (adminId: any) => adminId.toString() === user_id
        );
        
        if (adminIndex === -1) {
            res.status(404).json({ message: "Admin not found" });
            return;
        }
        
        // Prevent removing the last admin
        if (organizationData.admins.length <= 1) {
            res.status(400).json({ message: "Cannot remove the last admin" });
            return;
        }
        
        // Remove the admin
        organizationData.admins.splice(adminIndex, 1);
        
        // Remove organization from user's organizations list
        const userToRemove = await users.findById(user_id);
        if (userToRemove) {
            const orgIndex = userToRemove.organizations.findIndex(
                (orgId: any) => orgId.toString() === organization_id
            );
            if (orgIndex !== -1) {
                userToRemove.organizations.splice(orgIndex, 1);
                await userToRemove.save();
            }
        }
        
        await organizationData.save();

        res.status(200).json({ 
            message: "Admin removed successfully", 
            organization: {
                admins: organizationData.admins
            }
        });
    } catch (error) {
        next(error);
    }
}

export const getAdmins = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { organization_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;
        
        // Get the organization with populated admins, selecting only specific fields
        const organizationWithAdmins = await organizations.findById(organization_id)
            .populate({
                path: "admins",
                select: "user_id bio.first_name bio.last_name bio.headline profile_photo"
            });
            
        if (!organizationWithAdmins) {
            res.status(404).json({ message: "Organization not found" });
            return;
        }
        
        // Format the response to match the requested field names
        const formattedAdmins = organizationWithAdmins.admins.map((admin: any) => ({
            _id: admin._id,
            user_id: admin.user_id,
            first_name: admin.bio?.first_name || "",
            last_name: admin.bio?.last_name || "",
            headline: admin.bio?.headline || "",
            profile_picture: admin.profile_photo || ""
        }));
    
        res.status(200).json({ 
            admins: formattedAdmins
        });
    } catch (error) {
        next(error);
    }
}

export const getAdminsForUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { organization_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Get the organization with populated admins, selecting only specific fields
        const organizationWithAdmins = await organizations.findById(organization_id)
            .populate({
                path: "admins",
                select: "user_id bio.first_name bio.last_name bio.headline profile_photo"
            });
            
        if (!organizationWithAdmins) {
            res.status(404).json({ message: "Organization not found" });
            return;
        }
        
        // Format the response to match the requested field names
        const formattedAdmins = organizationWithAdmins.admins.map((admin: any) => ({
            _id: admin._id,
            user_id: admin.user_id,
            first_name: admin.bio?.first_name || "",
            last_name: admin.bio?.last_name || "",
            headline: admin.bio?.headline || "",
            profile_picture: admin.profile_photo || ""
        }));
    
        res.status(200).json({ 
            admins: formattedAdmins
        });
    } catch (error) {
        next(error);
    }
}

export const blockFollower = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { organization_id, follower_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;
        
        // Get the organization with populated followers
        const organizationWithFollowers = await organizations.findById(organization_id).populate("followers");
        if (!organizationWithFollowers) return;
            
        // Check if follower is also an admin
        const isFollowerAnAdmin = organizationWithFollowers.admins.some(
            (adminId: any) => adminId.toString() === follower_id
        );
        
        if (isFollowerAnAdmin) {
            res.status(400).json({ message: "Cannot block an admin user" });
            return;
        }

        const followerIndex = organizationWithFollowers.followers.findIndex(
            (follower: any) => follower._id.toString() === follower_id
        );
        
        if (followerIndex === -1) {
            res.status(404).json({ message: "Follower not found" });
            return;
        }

        // Remove from followers and add to blocked list
        const follower = organizationWithFollowers.followers.splice(followerIndex, 1)[0] as any;
        organizationWithFollowers.blocked.push(follower._id);
        
        // Get follower user data to update their saved jobs and applications
        const followerUser = await users.findById(follower_id);
        if (!followerUser) {
            res.status(404).json({ message: "Follower user not found" });
            return;
        }
        
        // Find all jobs belonging to this organization
        const organizationJobs = await jobs.find({ organization_id: organization_id });
        const organizationJobIds = organizationJobs.map(job => job._id?.toString());
        
        let savedJobsRemoved = 0;
        let applicationsRemoved = 0;
        
        // Remove any of these jobs from follower's saved_jobs
        if (followerUser.saved_jobs && followerUser.saved_jobs.length > 0) {
            const originalSavedJobsCount = followerUser.saved_jobs.length;
            followerUser.saved_jobs = followerUser.saved_jobs.filter(
                jobId => !organizationJobIds.includes(jobId.toString())
            );
            savedJobsRemoved = originalSavedJobsCount - followerUser.saved_jobs.length;
        }
        
        // Import job applications model
        const jobApplications = mongoose.model('jobApplications');
        
        // Find and remove all job applications by this follower to jobs from this organization
        if (organizationJobIds.length > 0) {
            const deletedApplications = await jobApplications.deleteMany({
                user_id: follower_id,
                job_id: { $in: organizationJobIds }
            });
            
            applicationsRemoved = deletedApplications.deletedCount;
            
            // Also remove these jobs from the user's applied_jobs list if that field exists
            if (followerUser.applied_jobs && followerUser.applied_jobs.length > 0) {
                followerUser.applied_jobs = followerUser.applied_jobs.filter(
                    jobId => !organizationJobIds.includes(jobId.toString())
                );
            }
        }
        
        // Save updates to the follower user
        await followerUser.save();
        
        // Save updates to the organization
        await organizationWithFollowers.save();

        res.status(200).json({ 
            message: "Follower blocked successfully",
            details: {
                savedJobsRemoved,
                applicationsRemoved
            }
        });
    } catch (error) {
        next(error);
    }
}

export const unblockFollower = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { organization_id, follower_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;
        
        // Get the organization with populated blocked users
        const organizationWithBlocked = await organizations.findById(organization_id).populate("blocked");
        if (!organizationWithBlocked) return;
    
        const followerIndex = organizationWithBlocked.blocked.findIndex(
            (follower: any) => follower._id.toString() === follower_id
        );
        
        if (followerIndex === -1) {
            res.status(404).json({ message: "Follower not found" });
            return;
        }

        // Remove from blocked list and add back to followers
        const follower = organizationWithBlocked.blocked.splice(followerIndex, 1)[0] as any;
        
        organizationWithBlocked.followers.push(follower._id);
        
        await organizationWithBlocked.save();

        res.status(200).json({ 
            message: "Follower unblocked successfully", 
            blocked_followers: organizationWithBlocked.blocked 
        });
    } catch (error) {
        next(error);
    }
}

export const getBlockedFollowers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { organization_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;

        // Get the organization with populated blocked users
        const organizationWithBlocked = await organizations.findById(organization_id)
        .populate({
            path: "blocked",
            select: "user_id bio.first_name bio.last_name bio.headline profile_photo"
        });
        if (!organizationWithBlocked) return;
    
        res.status(200).json({ blocked_followers: organizationWithBlocked.blocked });
    } catch (error) {
        next(error);
    }
}

export const followOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { organization_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        
        // Validate user is not already a follower
        const userIdStr = user._id?.toString();
        const isAlreadyFollower = organization.followers.some(
            (followerId: any) => followerId.toString() === userIdStr
        );
        if (isAlreadyFollower) {
            res.status(400).json({ message: "User is already a follower" });
            return;
        }

        // Validate user is not in blocked followers
        const isBlockedFollower = organization.blocked.some(
            (blockedId: any) => blockedId.toString() === userIdStr
        );
        if (isBlockedFollower) {
            res.status(400).json({ message: "User is blocked from following" });
            return;
        }
        
        // Add user ID to followers list
        organization.followers.push(user);
        
        await organization.save();

        res.status(200).json({ 
            message: "User followed successfully", 
            followers: organization.followers 
        });
    } catch (error) {
        next(error);
    }
    
}

export const unfollowOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { organization_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        const userIdStr = user._id?.toString();
        // Validate user is a follower
        const isFollower = organization.followers.some(
            (followerId: any) => followerId.toString() === userIdStr
        );
        
        if (!isFollower) {
            res.status(400).json({ message: "User is not a follower" });
            return;
        }
        
        // Remove user ID from followers list
        organization.followers = organization.followers.filter(
            (followerId: any) => followerId.toString() !== userIdStr
        );
        
        await organization.save();

        res.status(200).json({ 
            message: "User unfollowed successfully", 
            followers: organization.followers 
        });
    } catch (error) {
        next(error);
    }
}

export const getFollowers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { organization_id } = req.params;
        
        // Get organization profile and validate it exists
        const organization = await getCompanyProfileById(organization_id, res);
        if (!organization) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(organization, user._id, res);
        if (!isAdmin) return;

        // Get the organization with populated followers
        const organizationWithFollowers = await organizations.findById(organization_id)
        .populate({
            path: "followers",
            select: "user_id bio.first_name bio.last_name bio.headline profile_photo"
        });
        if (!organizationWithFollowers) return;
    
        res.status(200).json({ followers: organizationWithFollowers.followers });
    } catch (error) {
        next(error);
    }
}