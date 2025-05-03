import { NextFunction, Request, Response } from "express";
import { ObjectId } from "bson";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import { updateUserSkills, handleRemovedSkills, handleDeletedSkills, SkillSourceType, transformSkillsToObjects } from "../../utils/database.helper.ts";
import { processMediaArray, deleteMediaFromCloud } from "../../services/cloudinary.service.ts";

const addWorkExperience = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { title, employee_type, organization, is_current, start_date, end_date, location, description, location_type, skills, media } = req.body;

        const processedMedia = await processMediaArray(media);
        const experienceId = new ObjectId().toString();

        const newExperience = {
            _id: experienceId,
            title,
            employee_type,
            organization,
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
        
        updateUserSkills(user, skills, experienceId, SkillSourceType.EXPERIENCE);
        
        await user.save();

        // Transform skills to objects for response
        const responseExperience = {
            ...newExperience,
            skills: transformSkillsToObjects(user, skills)
        };

        res.status(200).json({ message: 'Work experience added successfully', experience: responseExperience });
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
            organization,
            is_current,
            start_date,
            end_date,
            location,
            description,
            location_type,
            skills,
            media: processedMedia,
        };
        
        updateUserSkills(user, skills, experienceId, SkillSourceType.EXPERIENCE);
        handleRemovedSkills(user, oldSkills, skills, experienceId, SkillSourceType.EXPERIENCE);
        
        await user.save();

        // Transform skills to objects for response
        const responseExperience = {
            _id: experienceId,
            title,
            employee_type,
            organization,
            is_current,
            start_date,
            end_date,
            location,
            description,
            location_type,
            media: processedMedia,
            skills: transformSkillsToObjects(user, skills)
        };

        res.status(200).json({ message: 'Work experience updated successfully', experience: responseExperience });
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
        
        const mediaObjects = user.work_experience[experienceIndex].media || [];
        const mediaUrls = mediaObjects.map(media => media.media);await deleteMediaFromCloud(mediaUrls);
        
        user.work_experience.splice(experienceIndex, 1);
        
        handleDeletedSkills(user, experienceSkills, experienceId, SkillSourceType.EXPERIENCE);

        await user.save();

        res.status(200).json({ message: 'Work experience deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export { addWorkExperience, updateWorkExperience, deleteWorkExperience }