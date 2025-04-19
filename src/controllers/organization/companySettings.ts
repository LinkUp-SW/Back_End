import { NextFunction, Request, Response } from "express";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import organizations from "../../models/organizations.model.ts";
import { getCompanyProfileById, validateUserIsCompanyAdmin } from "../../utils/helper.ts";

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
        
        await organizationWithFollowers.save();

        res.status(200).json({ 
            message: "Follower blocked successfully", 
            followers: organizationWithFollowers.followers 
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
        const organizationWithBlocked = await organizations.findById(organization_id).populate("blocked");
        if (!organizationWithBlocked) return;
    
        res.status(200).json({ blocked_followers: organizationWithBlocked.blocked });
    } catch (error) {
        next(error);
    }
}