import { NextFunction, Request, Response } from "express";
import { ObjectId } from "bson";
import { findUserByUserId } from "../../utils/database.helper.ts";
import tokenUtils from "../../utils/token.utils.ts";

const addWorkExperience = async (req: Request, res: Response, next : NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
        const decodedToken = tokenUtils.validateToken(token) as { userId: string };
    
        if (!decodedToken || !decodedToken.userId) {
          res.status(401).json({ message: "Unauthorized" });
          return;
        }
    
        const user = await findUserByUserId(decodedToken.userId, res);
        if (!user) return;

        const { title, employee_type, organization, is_current, start_date, end_date, location, description, location_type, skills, media } = req.body;

        const newExperience = {
            _id: new ObjectId().toString(),
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
            media,
        };

        user.work_experience.push(newExperience);
        
        if (skills && skills.length > 0) {
            for (const skillName of skills) {
                const skillIndex = user.skills.findIndex(skill => skill.name === skillName);
                
                if (skillIndex !== -1) {
                    // If skill exists, update used_where
                    const experienceExists = user.skills[skillIndex].used_where.includes(organization);
                
                    if (!experienceExists) {
                        // If this skill doesn't have this experience in used_where, add it
                        user.skills[skillIndex].used_where.push(organization);  
                    }
            } 
                else {
                    // If skill doesn't exist, create a new one
                    user.skills.push({
                        _id: new ObjectId().toString(),
                        name: skillName,
                        endorsments: [],
                        used_where: [organization]
                    });
                }
            }
        }
        
        await user.save();

        res.status(200).json({ message: 'Work experience added successfully', experience: newExperience });
    } catch (error) {
        next(error);
    }
};

const updateWorkExperience = async (req: Request, res: Response, next : NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
        const decodedToken = tokenUtils.validateToken(token) as { userId: string };
    
        if (!decodedToken || !decodedToken.userId) {
          res.status(401).json({ message: "Unauthorized" });
          return;
        }
    
        const user = await findUserByUserId(decodedToken.userId, res);
        if (!user) return;

        const { experienceId } = req.params;
        const { title, employee_type, organization, is_current, start_date, end_date, location, description, location_type, skills, media } = req.body;

        const experienceIndex = user.work_experience.findIndex((experience) => experience._id === experienceId);
        if (experienceIndex === -1) {
          res.status(404).json({ message: 'Experience not found' });
          return;
        }

        const oldSkills = user.work_experience[experienceIndex].skills || [];
        
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
            media,
        };
        
        // Process skills - handle both new skills and removed skills
        if (skills && skills.length > 0) {
            for (const skillName of skills) {
                const skillIndex = user.skills.findIndex(skill => skill.name === skillName);
                
                if (skillIndex !== -1) {
                    // If skill exists, update used_where
                    const experienceExists = user.skills[skillIndex].used_where.includes(organization);
                    
                    if (!experienceExists) {
                        // If this skill doesn't have this experience in used_where, add it
                        user.skills[skillIndex].used_where.push(organization);  
                    }
                } else {
                    user.skills.push({
                        _id: new ObjectId().toString(),
                        name: skillName,
                        endorsments: [],
                        used_where: [organization]
                    });
                }
            }
        }
            
        // Handle removed skills - if they were in oldSkills but not in new skills
        const removedSkills = oldSkills.filter(skill => !skills.includes(skill));
        for (const skillName of removedSkills) {
            const skillIndex = user.skills.findIndex(skill => skill.name === skillName);
            if (skillIndex !== -1) {
                // Remove this experience from the skill's used_where array
                user.skills[skillIndex].used_where = user.skills[skillIndex].used_where.filter(
                    org => org !== organization
                );
            }
        }

        
        await user.save();

        res.status(200).json({ message: 'Work experience updated successfully', experience: user.work_experience[experienceIndex] });
    } catch (error) {
        next(error);
    }
};

const deleteWorkExperience = async (req: Request, res: Response, next : NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
        const decodedToken = tokenUtils.validateToken(token) as { userId: string };

        if (!decodedToken || !decodedToken.userId) {
          res.status(401).json({ message: "Unauthorized" });
          return;
        }
    
        const user = await findUserByUserId(decodedToken.userId, res);
        if (!user) return;

        const { experienceId } = req.params;

        const experienceIndex = user.work_experience.findIndex((experience) => experience._id === experienceId);
        if (experienceIndex === -1) {
          res.status(404).json({ message: 'Work Experience not found' });
          return;
        }
        
        // Get the skills and organization from the experience to be deleted
        const experienceSkills = user.work_experience[experienceIndex].skills || [];
        const organization = user.work_experience[experienceIndex].organization;
        
        // Remove the experience to be deleted first
        user.work_experience.splice(experienceIndex, 1);
        
        // Check if this organization is used in any remaining work experiences
        const organizationStillUsed = user.work_experience.some(exp => 
            exp.organization === organization
        );
        
        // Process skills - remove organization from skills' used_where arrays if needed
            for (const skillName of experienceSkills) {
                const skillIndex = user.skills.findIndex(skill => skill.name === skillName);
                if (skillIndex !== -1) {
                    if (!organizationStillUsed) {
                        // Remove the organization from the skill's used_where array
                        user.skills[skillIndex].used_where = user.skills[skillIndex].used_where.filter(
                            org => org !== organization
                        );
                }
            }
        }

        await user.save();

        res.status(200).json({ message: 'Work experience deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export { addWorkExperience, updateWorkExperience, deleteWorkExperience }