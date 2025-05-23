import { NextFunction, Request, Response } from "express";
import organizations from "../../models/organizations.model.ts";
import users from "../../models/users.model.ts";
import jobs from "../../models/jobs.model.ts"; 
import { validateTokenAndGetUser } from "../../utils/helperFunctions.utils.ts";
import { getCompanyProfileById, validateUserIsCompanyAdmin, handleLogoUpload } from "../../utils/helper.ts";

export const createCompanyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { name, category_type, website, logo, description, industry, location, size, type } = req.body;
        
        // Handle logo upload
        let logoUrl;
        try {
            logoUrl = await handleLogoUpload(logo);
        } catch (uploadError) {
            console.error("Error uploading logo:", uploadError);
            res.status(500).json({ message: "Error uploading company logo" });
            return;
        }

        const newCompanyProfile = new organizations({
            name,
            category_type,
            website,
            logo: logoUrl,
            description,
            industry,
            location,
            size,
            type,
            admins: [user._id],
        });

        await newCompanyProfile.save();

        user.organizations.push(newCompanyProfile);

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

        const { name, category_type, website, logo, description, industry, location, tagline, size, type, phone } = req.body;

        // Handle logo upload with existing logo for replacement
        let logoUrl;
        try {
            logoUrl = await handleLogoUpload(logo, companyProfile.logo);
        } catch (uploadError) {
            console.error("Error uploading logo:", uploadError);
            res.status(500).json({ message: "Error uploading company logo" });
            return;
        }

        const updatedCompanyProfile = await organizations.findByIdAndUpdate(
            companyId,
            {
                name,
                category_type,
                website,
                logo: logoUrl,
                description,
                industry,
                location,
                tagline,
                size,
                type,
                phone
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

        // Delete all jobs associated with this organization
        const deletedJobs = await jobs.deleteMany({ organization_id: companyId });
        
        // Delete the organization
        await organizations.findByIdAndDelete(companyId);

        res.status(200).json({ 
            message: "Company profile deleted successfully", 
            deletedJobsCount: deletedJobs.deletedCount 
        });
    } catch (error) {
        next(error);
    }
}

export const getCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { companyId } = req.params;
        
        // Get company profile and validate it exists
        const companyProfile = await getCompanyProfileById(companyId, res);
        if (!companyProfile) return;

        const followerCount = companyProfile.followers ? companyProfile.followers.length : 0;

        res.status(200).json({ message: "Company profile retrieved successfully", companyProfile, followerCount });
    } catch (error) {
        next(error);
    }
}

export const getCompanyAdminView = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Get user from token
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;

        const { companyId } = req.params;
        
        // Get company profile and validate it exists
        const companyProfile = await getCompanyProfileById(companyId, res);
        if (!companyProfile) return;
        
        // Validate user is an admin
        const isAdmin = validateUserIsCompanyAdmin(companyProfile, user._id, res);
        if (!isAdmin) return;
        
        // Format company info with follower count
        const companyInfo = {
            _id: companyProfile._id,
            name: companyProfile.name,
            logo: companyProfile.logo,
            followerCount: companyProfile.followers ? companyProfile.followers.length : 0
        };

        res.status(200).json({ 
            message: "Company basic info retrieved successfully", 
            company: companyInfo 
        });
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
        const userOrganizations = await organizations.find(
            { admins: user._id },
            { name: 1, logo: 1 } // Project only name and logo fields
        );

        res.status(200).json({ 
            organizations: userOrganizations
        });
    } catch (error) {
        next(error);
    }
}