import { NextFunction, Request, Response } from "express";
import { ObjectId } from "bson";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import users from "../../models/users.model.ts";

const addSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { name, educations, experiences, licenses } = req.body;

        // Validate if name already exists
        const skillExists = user.skills.some(skill => skill.name.toLowerCase() === name.toLowerCase());
        if (skillExists) {
            res.status(400).json({ message: 'A skill with this name already exists' });
            return;
        }

        // Store IDs as strings
        const educationIds = Array.isArray(educations) ? educations.map(id => id.toString()) : [];
        const experienceIds = Array.isArray(experiences) ? experiences.map(id => id.toString()) : [];
        const licenseIds = Array.isArray(licenses) ? licenses.map(id => id.toString()) : [];

        const newSkill = {
            _id: new ObjectId().toString(),
            name,
            endorsments: [],
            educations: educationIds,
            experiences: experienceIds,
            licenses: licenseIds,
        };

        user.skills.push(newSkill);
        await user.save();

        // Get fully populated user data to access organizations
        const populatedUser = await users.findById(user._id)
            .populate('education.school')
            .populate('work_experience.organization')
            .populate('liscence_certificates.issuing_organization');
        
        if (!populatedUser) return;

        // Prepare response with organization logos
        const educationObjects = educationIds.map(id => {
            const edu = populatedUser.education.find(edu => edu._id.toString() === id);
            if (edu && edu.school) {
                return {
                    _id: edu._id,
                    name: edu.school.name,
                    logo: edu.school.logo
                };
            }
            return null;
        }).filter(Boolean);
        
        const experienceObjects = experienceIds.map(id => {
            const exp = populatedUser.work_experience.find(exp => exp._id.toString() === id);
            if (exp && exp.organization) {
                return {
                    _id: exp._id,
                    name: exp.title,
                    logo: exp.organization.logo
                };
            }
            return null;
        }).filter(Boolean);
        
        const licenseObjects = licenseIds.map(id => {
            const lic = populatedUser.liscence_certificates.find(lic => lic._id.toString() === id);
            if (lic && lic.issuing_organization) {
                return {
                    _id: lic._id,
                    name: lic.name,
                    logo: lic.issuing_organization.logo
                };
            }
            return null;
        }).filter(Boolean);

        const responseSkill = {
            ...newSkill,
            educations: educationObjects,
            experiences: experienceObjects,
            licenses: licenseObjects
        };

        res.status(200).json({ 
            message: 'Skill added successfully', 
            skill: responseSkill 
        });
    } catch (error) {
        next(error);
    }
};

const updateSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { skillId } = req.params;
        const { educations, experiences, licenses } = req.body;

        const skillIndex = user.skills.findIndex((skill) => skill._id === skillId);
        if (skillIndex === -1) {
            res.status(404).json({ message: 'Skill not found' });
            return;
        }
        
        const currentName = user.skills[skillIndex].name;
        const currentEndorsments = user.skills[skillIndex].endorsments;

        // Store IDs as strings
        const educationIds = Array.isArray(educations) ? educations.map(id => id.toString()) : [];
        const experienceIds = Array.isArray(experiences) ? experiences.map(id => id.toString()) : [];
        const licenseIds = Array.isArray(licenses) ? licenses.map(id => id.toString()) : [];

        user.skills[skillIndex] = {
            _id: skillId,
            name: currentName,
            endorsments: currentEndorsments,
            educations: educationIds,
            experiences: experienceIds,
            licenses: licenseIds,
        };

        await user.save();
        
        // Get fully populated user data to access organizations
        const populatedUser = await users.findById(user._id)
            .populate('education.school')
            .populate('work_experience.organization')
            .populate('liscence_certificates.issuing_organization');
        if (!populatedUser) return;

        // Prepare response with organization logos
        const educationObjects = educationIds.map(id => {
            const edu = populatedUser.education.find(edu => edu._id.toString() === id);
            if (edu && edu.school) {
                return {
                    _id: edu._id,
                    name: edu.school.name,
                    logo: edu.school.logo
                };
            }
            return null;
        }).filter(Boolean);
        
        const experienceObjects = experienceIds.map(id => {
            const exp = populatedUser.work_experience.find(exp => exp._id.toString() === id);
            if (exp && exp.organization) {
                return {
                    _id: exp._id,
                    name: exp.title,
                    logo: exp.organization.logo
                };
            }
            return null;
        }).filter(Boolean);
        
        const licenseObjects = licenseIds.map(id => {
            const lic = populatedUser.liscence_certificates.find(lic => lic._id.toString() === id);
            if (lic && lic.issuing_organization) {
                return {
                    _id: lic._id,
                    name: lic.name,
                    logo: lic.issuing_organization.logo
                };
            }
            return null;
        }).filter(Boolean);

        const responseSkill = {
            ...user.skills[skillIndex],
            educations: educationObjects,
            experiences: experienceObjects,
            licenses: licenseObjects
        };

        res.status(200).json({ 
            message: 'Skill updated successfully', 
            skill: responseSkill 
        });
    } catch (error) {
        next(error);
    }
};

const deleteSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { skillId } = req.params;

        const skillIndex = user.skills.findIndex((skill) => skill._id === skillId);
        if (skillIndex === -1) {
            res.status(404).json({ message: 'Skill not found' });
            return;
        }

        user.skills.splice(skillIndex, 1);
        await user.save();

        res.status(200).json({ message: 'Skill deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const getUserSections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        // Get fully populated user data
        const populatedUser = await users.findById(user._id)
            .populate('education.school')
            .populate('work_experience.organization')
            .populate('liscence_certificates.issuing_organization');
        
        if (!populatedUser) {
            res.status(404).json({ message: 'User data not found' });
            return;
        }

        // Format education entries
        const educations = populatedUser.education.map(edu => ({
            _id: edu._id,
            name: edu.school?.name || 'Unknown School'
        }));
        
        // Format experience entries
        const experiences = populatedUser.work_experience.map(exp => ({
            _id: exp._id,
            name: exp.title || 'Unknown Position'
        }));
        
        // Format license entries
        const licenses = populatedUser.liscence_certificates.map(lic => ({
            _id: lic._id,
            name: lic.name || 'Unknown Certificate'
        }));

        res.status(200).json({
            educations,
            experiences,
            licenses
        });
    } catch (error) {
        next(error);
    }
};

export { addSkill, updateSkill, deleteSkill, getUserSections };
