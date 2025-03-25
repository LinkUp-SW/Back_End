import { NextFunction, Request, Response } from "express";
import { ObjectId } from "bson";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import { updateUserSkills, handleRemovedSkills, handleDeletedExperienceSkills } from "../../utils/database.helper.ts";
import { processMediaArray } from "../../services/cloudinaryService.ts";

const addEducation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { school, degree, field_of_study, start_date, end_date, grade, activites_and_socials, skills, description, media } = req.body;

        const processedMedia = await processMediaArray(media);

        const newEducation = {
            _id: new ObjectId().toString(),
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
        
        updateUserSkills(user, skills, school);
        
        await user.save();

        res.status(200).json({ message: 'Education entry added successfully', education: newEducation });
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
        
        updateUserSkills(user, skills, school);
        handleRemovedSkills(user, oldSkills, skills, school);
        
        await user.save();

        res.status(200).json({ message: 'Education entry updated successfully', education: user.education[educationIndex] });
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
        
        user.education.splice(educationIndex, 1);
        
        handleDeletedExperienceSkills(user, educationSkills, school);

        await user.save();

        res.status(200).json({ message: 'Education entry deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export { addEducation, updateEducation, deleteEducation }
