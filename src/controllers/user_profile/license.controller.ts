import { NextFunction, Request, Response } from "express";
import { ObjectId } from "bson";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import { updateUserSkills, handleRemovedSkills, handleDeletedSkills, SkillSourceType, transformSkillsToObjects } from "../../utils/database.helper.ts";
import { processMediaArray, deleteMediaFromCloud } from "../../services/cloudinary.service.ts";

const addLicense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { name, issuing_organization, issue_date, expiration_date, credintial_id, credintial_url, skills, media } = req.body;

        const processedMedia = await processMediaArray(media);
        const licenseId = new ObjectId().toString();

        const newLicense = {
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

        if (!user.liscence_certificates) {
            user.liscence_certificates = [];
        }
        
        user.liscence_certificates.push(newLicense);
        
        updateUserSkills(user, skills, licenseId, SkillSourceType.LICENSE);
        
        await user.save();

        // Transform skills to objects for response
        const responseLicense = {
            ...newLicense,
            skills: transformSkillsToObjects(user, skills)
        };

        res.status(200).json({ message: 'License/Certificate added successfully', license: responseLicense });
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
        
        updateUserSkills(user, skills, licenseId, SkillSourceType.LICENSE);
        handleRemovedSkills(user, oldSkills, skills, licenseId, SkillSourceType.LICENSE);
        
        await user.save();

        // Transform skills to objects for response
        const responseLicense = {
            _id: licenseId,
            name,
            issuing_organization,
            issue_date,
            expiration_date,
            credintial_id,
            credintial_url,
            media: processedMedia,
            skills: transformSkillsToObjects(user, skills)
        };

        res.status(200).json({ message: 'License/Certificate updated successfully', license: responseLicense });
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
        
        const mediaObjects = user.liscence_certificates[licenseIndex].media || [];
        const mediaUrls = mediaObjects.map(media => media.media);
        
        await deleteMediaFromCloud(mediaUrls);
        
        user.liscence_certificates.splice(licenseIndex, 1);
        
        handleDeletedSkills(user, licenseSkills, licenseId, SkillSourceType.LICENSE);

        await user.save();

        res.status(200).json({ message: 'License/Certificate deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export { addLicense, updateLicense, deleteLicense }
