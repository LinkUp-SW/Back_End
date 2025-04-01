import { NextFunction, Request, Response } from "express";
import { ObjectId } from "bson";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import { updateUserSkills, handleRemovedSkills, handleDeletedExperienceSkills } from "../../utils/database.helper.ts";
import { processMediaArray, deleteMediaFromCloud } from "../../services/cloudinary.service.ts";
import organizations from "../../models/organizations.model.ts";

const addWorkExperience = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { title, employee_type, organization, is_current, start_date, end_date, location, description, location_type, skills, media } = req.body;

        const processedMedia = await processMediaArray(media);

        const newExperience = {
            _id: new ObjectId().toString(),
            title,
            employee_type,
            organization: organization._id,
            is_current,
            start_date,
            end_date,
            location,
            description,
            location_type,
            skills,
            media: processedMedia,
        };

        user.work_experience.push(newExperience);
        
        updateUserSkills(user, skills, organization);
        
        await user.save();  

        res.status(200).json({ message: 'Work experience added successfully', experience: newExperience });
    } catch (error) {
        next(error);
    }
};

const updateWorkExperience = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { experienceId } = req.params;
        const { title, employee_type, organization, is_current, start_date, end_date, location, description, location_type, skills, media } = req.body;

        const experienceIndex = user.work_experience.findIndex((experience) => experience._id === experienceId);
        if (experienceIndex === -1) {
          res.status(404).json({ message: 'Experience not found' });
          return;
        }

        const oldSkills = user.work_experience[experienceIndex].skills || [];
        
        const processedMedia = await processMediaArray(media);

        user.work_experience[experienceIndex] = {
            _id: experienceId,
            title,
            employee_type,
            organization: organization._id,
            is_current,
            start_date,
            end_date,
            location,
            description,
            location_type,
            skills,
            media: processedMedia,
        };
        
        updateUserSkills(user, skills, organization);
        handleRemovedSkills(user, oldSkills, skills, organization);
        
        await user.save();

        res.status(200).json({ message: 'Work experience updated successfully', experience: user.work_experience[experienceIndex] });
    } catch (error) {
        next(error);
    }
};

const deleteWorkExperience = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { experienceId } = req.params;

        const experienceIndex = user.work_experience.findIndex((experience) => experience._id === experienceId);
        if (experienceIndex === -1) {
          res.status(404).json({ message: 'Work Experience not found' });
          return;
        }
        
        const experienceSkills = user.work_experience[experienceIndex].skills || [];
        const organization = user.work_experience[experienceIndex].organization;
        
        const mediaObjects = user.liscence_certificates[experienceIndex].media || [];
        const mediaUrls = mediaObjects.map(media => media.media);await deleteMediaFromCloud(mediaUrls);
        
        user.work_experience.splice(experienceIndex, 1);
        
        handleDeletedExperienceSkills(user, experienceSkills, organization);

        await user.save();

        res.status(200).json({ message: 'Work experience deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export { addWorkExperience, updateWorkExperience, deleteWorkExperience }