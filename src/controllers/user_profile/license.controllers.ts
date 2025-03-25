import { NextFunction, Request, Response } from "express";
import { ObjectId } from "bson";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import { updateUserSkills, handleRemovedSkills, handleDeletedExperienceSkills } from "../../utils/database.helper.ts";
import { processMediaArray } from "../../services/cloudinaryService.ts";

const addLicense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { name, issuing_organization, issue_date, expiration_date, credintial_id, credintial_url, skills, media } = req.body;

        const processedMedia = await processMediaArray(media);

        const newLicense = {
            _id: new ObjectId().toString(),
            name,
            issuing_organization,
            issue_date,
            expiration_date,
            credintial_id,
            credintial_url,
            skills,
            media: processedMedia,
        };

        if (!user.liscence_certificates) {
            user.liscence_certificates = [];
        }
        
        user.liscence_certificates.push(newLicense);
        
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
        
        const processedMedia = await processMediaArray(media);

        user.liscence_certificates[licenseIndex] = {
            _id: licenseId,
            name,
            issuing_organization,
            issue_date,
            expiration_date,
            credintial_id,
            credintial_url,
            skills,
            media: processedMedia,
        };
        
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
        
        const licenseSkills = user.liscence_certificates[licenseIndex].skills || [];
        const organization = user.liscence_certificates[licenseIndex].issuing_organization;
        
        user.liscence_certificates.splice(licenseIndex, 1);
        
        handleDeletedExperienceSkills(user, licenseSkills, organization);

        await user.save();

        res.status(200).json({ message: 'License/Certificate deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export { addLicense, updateLicense, deleteLicense }
