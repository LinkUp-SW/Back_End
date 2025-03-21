import { NextFunction, Request, Response } from "express";
import { ObjectId } from "bson";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import { updateUserSkills, handleRemovedSkills, handleDeletedExperienceSkills } from "../../utils/database.helper.ts";

const addLicense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { name, issuing_organization, issue_date, expiration_date, credintial_id, credintial_url, skills, media } = req.body;

        const newLicense = {
            _id: new ObjectId().toString(),
            name,
            issuing_organization,
            issue_date,
            expiration_date,
            credintial_id,
            credintial_url,
            skills,
            media,
        };

        if (!user.liscence_certificates) {
            user.liscence_certificates = [];
        }
        
        user.liscence_certificates.push(newLicense);
        
        // Update user skills
        updateUserSkills(user, skills, issuing_organization);
        
        await user.save();

        res.status(200).json({ message: 'License/Certificate added successfully', license: newLicense });
    } catch (error) {
        next(error);
    }
};

const updateLicense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { licenseId } = req.params;
        const { name, issuing_organization, issue_date, expiration_date, credintial_id, credintial_url, skills, media } = req.body;

        if (!user.liscence_certificates) {
            user.liscence_certificates = [];
        }

        const licenseIndex = user.liscence_certificates.findIndex((license) => license._id === licenseId);
        if (licenseIndex === -1) {
          res.status(404).json({ message: 'License/Certificate not found' });
          return;
        }

        const oldSkills = user.liscence_certificates[licenseIndex].skills || [];
        
        user.liscence_certificates[licenseIndex] = {
            _id: licenseId,
            name,
            issuing_organization,
            issue_date,
            expiration_date,
            credintial_id,
            credintial_url,
            skills,
            media,
        };
        
        // Update skills and handle removed skills
        updateUserSkills(user, skills, issuing_organization);
        handleRemovedSkills(user, oldSkills, skills, issuing_organization);
        
        await user.save();

        res.status(200).json({ message: 'License/Certificate updated successfully', license: user.liscence_certificates[licenseIndex] });
    } catch (error) {
        next(error);
    }
};

const deleteLicense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { licenseId } = req.params;

        if (!user.liscence_certificates) {
            user.liscence_certificates = [];
        }

        const licenseIndex = user.liscence_certificates.findIndex((license) => license._id === licenseId);
        if (licenseIndex === -1) {
          res.status(404).json({ message: 'License/Certificate not found' });
          return;
        }
        
        // Get the skills and organization from the license to be deleted
        const licenseSkills = user.liscence_certificates[licenseIndex].skills || [];
        const organization = user.liscence_certificates[licenseIndex].issuing_organization;
        
        // Remove the license to be deleted
        user.liscence_certificates.splice(licenseIndex, 1);
        
        // Handle skill and organization updates
        handleDeletedExperienceSkills(user, licenseSkills, organization);

        await user.save();

        res.status(200).json({ message: 'License/Certificate deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export { addLicense, updateLicense, deleteLicense }
