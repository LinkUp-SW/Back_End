import { NextFunction, Request, Response } from "express";
import organizations from "../../models/organizations.model.ts";
import users from "../../models/users.model.ts";
import { validateTokenAndGetUser } from "../../utils/helperFunctions.utils.ts";
import { getCompanyProfileById, validateUserIsCompanyAdmin } from "../../utils/helper.ts";

export const createCompanyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { name, category_type, unique_url, website, logo, description, industry, location, size, type } = req.body;

        const newCompanyProfile = new organizations({
            name,
            category_type,
            unique_url,
            website,
            logo,
            description,
            industry,
            location,
            size,
            type,
            admins: [user._id],
        });

        await newCompanyProfile.save();

        res.status(201).json({ message: "Company profile created successfully", companyProfile: newCompanyProfile });
    } catch (error) {
        next(error);
    }
}

export const updateCompanyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { companyId } = req.params;
        
        // Get company profile and validate it exists
        const companyProfile = await getCompanyProfileById(companyId, res);
        if (!companyProfile) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(companyProfile, user._id, res);
        if (!isAdmin) return;

        const { name, category_type, unique_url, website, logo, description, industry, location, size, type } = req.body;

        const updatedCompanyProfile = await organizations.findByIdAndUpdate(
            companyId,
            {
                name,
                category_type,
                unique_url,
                website,
                logo,
                description,
                industry,
                location,
                size,
                type,
            },
            { new: true }
        );

        res.status(200).json({ message: "Company profile updated successfully", companyProfile: updatedCompanyProfile });
    } catch (error) {
        next(error);
    }
}

export const deleteCompanyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { companyId } = req.params;
        
        // Get company profile and validate it exists
        const companyProfile = await getCompanyProfileById(companyId, res);
        if (!companyProfile) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(companyProfile, user._id, res);
        if (!isAdmin) return;
        
        // Get all admins and remove organization from their organizations list
        const adminIds = companyProfile.admins.map((admin: any) => admin.toString());
        await users.updateMany(
            { _id: { $in: adminIds } },
            { $pull: { organizations: companyId } }
        );

        await organizations.findByIdAndDelete(companyId);

        res.status(200).json({ message: "Company profile deleted successfully" });
    } catch (error) {
        next(error);
    }
}

export const getCompanyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { companyId } = req.params;
        
        // Get company profile and validate it exists
        const companyProfile = await getCompanyProfileById(companyId, res);
        if (!companyProfile) return;

        res.status(200).json({ message: "Company profile retrieved successfully", companyProfile });
    } catch (error) {
        next(error);
    }
}

export const getUserAdminOrganizations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Get user from token
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        // Find organizations where the user is an admin
        // Include the followers field to calculate its length
        const userOrganizations = await organizations.find(
            { admins: user._id },
            { name: 1, logo: 1, followers: 1 } // Add followers to projection
        );

        // Map the results to include follower count
        const orgsWithFollowerCount = userOrganizations.map(org => ({
            _id: org._id,
            name: org.name,
            logo: org.logo,
            followerCount: org.followers ? org.followers.length : 0
        }));

        res.status(200).json({ 
            organizations: orgsWithFollowerCount
        });
    } catch (error) {
        next(error);
    }
}