import { NextFunction, Request, Response } from "express";
import { ObjectId } from "bson";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import { updateUserSkills, handleRemovedSkills, handleDeletedSkills, SkillSourceType, transformSkillsToObjects } from "../../utils/database.helper.ts";
import { processMediaArray, deleteMediaFromCloud } from "../../services/cloudinary.service.ts";

const addEducation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { school, degree, field_of_study, start_date, end_date, grade, activites_and_socials, skills, description, media } = req.body;

        const processedMedia = await processMediaArray(media);
        const educationId = new ObjectId().toString();

        const newEducation = {
            _id: educationId,
            school,
            degree,
            field_of_study,
            start_date,
            end_date,
            grade,
            activites_and_socials,
            skills,
            description,
            media: processedMedia,
        };

        user.education.push(newEducation);
        
        updateUserSkills(user, skills, educationId, SkillSourceType.EDUCATION);
        
        await user.save();

        // Transform skills to objects for response
        const responseEducation = {
            ...newEducation,
            skills: transformSkillsToObjects(user, skills)
        };

        res.status(200).json({ message: 'Education entry added successfully', education: responseEducation });
    } catch (error) {
        next(error);
    }
};

const updateEducation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { educationId } = req.params;
        const { school, degree, field_of_study, start_date, end_date, grade, activites_and_socials, skills, description, media } = req.body;

        const educationIndex = user.education.findIndex((edu) => edu._id === educationId);
        if (educationIndex === -1) {
          res.status(404).json({ message: 'Education entry not found' });
          return;
        }

        const oldSkills = user.education[educationIndex].skills || [];
        
        const processedMedia = await processMediaArray(media);
        
        user.education[educationIndex] = {
            _id: educationId,
            school,
            degree,
            field_of_study,
            start_date,
            end_date,
            grade,
            activites_and_socials,
            skills,
            description,
            media: processedMedia,
        };
        
        updateUserSkills(user, skills, educationId, SkillSourceType.EDUCATION);
        handleRemovedSkills(user, oldSkills, skills, educationId, SkillSourceType.EDUCATION);
        
        await user.save();

        // Transform skills to objects for response
        const responseEducation = {
            ...user.education[educationIndex],
            skills: transformSkillsToObjects(user, skills)
        };

        res.status(200).json({ message: 'Education entry updated successfully', education: responseEducation });
    } catch (error) {
        next(error);
    }
};

const deleteEducation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { educationId } = req.params;

        const educationIndex = user.education.findIndex((edu) => edu._id === educationId);
        if (educationIndex === -1) {
          res.status(404).json({ message: 'Education entry not found' });
          return;
        }
        
        const educationSkills = user.education[educationIndex].skills || [];
        const school = user.education[educationIndex].school;
        
        const mediaObjects = user.education[educationIndex].media || [];
        const mediaUrls = mediaObjects.map(media => media.media);
        await deleteMediaFromCloud(mediaUrls);
        
        user.education.splice(educationIndex, 1);
        
        handleDeletedSkills(user, educationSkills, educationId, SkillSourceType.EDUCATION);

        await user.save();

        res.status(200).json({ message: 'Education entry deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export { addEducation, updateEducation, deleteEducation }
