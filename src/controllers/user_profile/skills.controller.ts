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

        // Add skill to user's skills array
        user.skills.push(newSkill);
        
        // Update skills array in education records
        educationIds.forEach(eduId => {
            const education = user.education.find(edu => edu._id.toString() === eduId);
            if (education && !education.skills.includes(name)) {
                education.skills.push(name);
            }
        });
        
        // Update skills array in work experience records
        experienceIds.forEach(expId => {
            const experience = user.work_experience.find(exp => exp._id.toString() === expId);
            if (experience && !experience.skills.includes(name)) {
                experience.skills.push(name);
            }
        });
        
        // Update skills array in license records
        licenseIds.forEach(licId => {
            const license = user.liscence_certificates.find(lic => lic._id.toString() === licId);
            if (license && !license.skills.includes(name)) {
                license.skills.push(name);
            }
        });

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
        
        // Get previous references to remove skill from those that are no longer associated
        const previousEducationIds = user.skills[skillIndex].educations;
        const previousExperienceIds = user.skills[skillIndex].experiences;
        const previousLicenseIds = user.skills[skillIndex].licenses;

        // Store IDs as strings
        const educationIds = Array.isArray(educations) ? educations.map(id => id.toString()) : [];
        const experienceIds = Array.isArray(experiences) ? experiences.map(id => id.toString()) : [];
        const licenseIds = Array.isArray(licenses) ? licenses.map(id => id.toString()) : [];

        // Remove skill from education records that are no longer associated
        previousEducationIds.forEach(eduId => {
            if (!educationIds.includes(eduId)) {
                const education = user.education.find(edu => edu._id.toString() === eduId);
                if (education) {
                    const skillIndex = education.skills.indexOf(currentName);
                    if (skillIndex !== -1) {
                        education.skills.splice(skillIndex, 1);
                    }
                }
            }
        });
        
        // Remove skill from work experience records that are no longer associated
        previousExperienceIds.forEach(expId => {
            if (!experienceIds.includes(expId)) {
                const experience = user.work_experience.find(exp => exp._id.toString() === expId);
                if (experience) {
                    const skillIndex = experience.skills.indexOf(currentName);
                    if (skillIndex !== -1) {
                        experience.skills.splice(skillIndex, 1);
                    }
                }
            }
        });
        
        // Remove skill from license records that are no longer associated
        previousLicenseIds.forEach(licId => {
            if (!licenseIds.includes(licId)) {
                const license = user.liscence_certificates.find(lic => lic._id.toString() === licId);
                if (license) {
                    const skillIndex = license.skills.indexOf(currentName);
                    if (skillIndex !== -1) {
                        license.skills.splice(skillIndex, 1);
                    }
                }
            }
        });

        // Add skill to newly associated education records
        educationIds.forEach(eduId => {
            if (!previousEducationIds.includes(eduId)) {
                const education = user.education.find(edu => edu._id.toString() === eduId);
                if (education && !education.skills.includes(currentName)) {
                    education.skills.push(currentName);
                }
            }
        });
        
        // Add skill to newly associated work experience records
        experienceIds.forEach(expId => {
            if (!previousExperienceIds.includes(expId)) {
                const experience = user.work_experience.find(exp => exp._id.toString() === expId);
                if (experience && !experience.skills.includes(currentName)) {
                    experience.skills.push(currentName);
                }
            }
        });
        
        // Add skill to newly associated license records
        licenseIds.forEach(licId => {
            if (!previousLicenseIds.includes(licId)) {
                const license = user.liscence_certificates.find(lic => lic._id.toString() === licId);
                if (license && !license.skills.includes(currentName)) {
                    license.skills.push(currentName);
                }
            }
        });

        // Update the skill in the user's skills array
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
            _id: skillId,
            name: currentName,
            endorsments: currentEndorsments,
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

        const skillToDelete = user.skills[skillIndex];
        const skillName = skillToDelete.name;

        // Remove skill from all associated education records
        skillToDelete.educations.forEach(eduId => {
            const education = user.education.find(edu => edu._id.toString() === eduId);
            if (education) {
                const skillIndex = education.skills.indexOf(skillName);
                if (skillIndex !== -1) {
                    education.skills.splice(skillIndex, 1);
                }
            }
        });
        
        // Remove skill from all associated work experience records
        skillToDelete.experiences.forEach(expId => {
            const experience = user.work_experience.find(exp => exp._id.toString() === expId);
            if (experience) {
                const skillIndex = experience.skills.indexOf(skillName);
                if (skillIndex !== -1) {
                    experience.skills.splice(skillIndex, 1);
                }
            }
        });
        
        // Remove skill from all associated license records
        skillToDelete.licenses.forEach(licId => {
            const license = user.liscence_certificates.find(lic => lic._id.toString() === licId);
            if (license) {
                const skillIndex = license.skills.indexOf(skillName);
                if (skillIndex !== -1) {
                    license.skills.splice(skillIndex, 1);
                }
            }
        });

        // Remove the skill from the user's skills array
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

const endorseSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { userId } = req.params;
        const { skillId } = req.params;

        // Find the target user whose skill is being endorsed
        const targetUser = await users.findOne({ user_id: userId });
        if (!targetUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Find the skill to endorse
        const skillIndex = targetUser.skills.findIndex((skill) => skill._id === skillId);
        if (skillIndex === -1) {
            res.status(404).json({ message: 'Skill not found' });
            return;
        }
    
        const userIdStr = user._id?.toString();
        
        // Verify user ID exists before proceeding
        if (!userIdStr) {
            res.status(400).json({ message: 'Invalid user ID' });
            return;
        }
        
        const alreadyEndorsed = targetUser.skills[skillIndex].endorsments.some(
            endorserId => endorserId?.toString() === userIdStr
        );
        
        if (alreadyEndorsed) {
            res.status(400).json({ message: 'You have already endorsed this skill' });
            return;
        }

        targetUser.skills[skillIndex].endorsments.push(user);
        await targetUser.save();

        res.status(200).json({ 
            message: 'Skill endorsed successfully',
            endorsements_count: targetUser.skills[skillIndex].endorsments.length
        });
    } catch (error) {
        next(error);
    }
};

const removeEndorsement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { userId } = req.params;
        const { skillId } = req.params;

        // Find the target user
        const targetUser = await users.findOne({ user_id: userId });
        if (!targetUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Find the skill
        const skillIndex = targetUser.skills.findIndex((skill) => skill._id === skillId);
        if (skillIndex === -1) {
            res.status(404).json({ message: 'Skill not found' });
            return;
        }

        const userIdStr = user._id?.toString();

        // Verify user ID exists before proceeding
        if (!userIdStr) {
            res.status(400).json({ message: 'Invalid user ID' });
            return;
        }
        const endorsementIndex = targetUser.skills[skillIndex].endorsments.findIndex(
            endorserId => endorserId.toString() === userIdStr
        );
        
        if (endorsementIndex === -1) {
            res.status(400).json({ message: 'You have not endorsed this skill' });
            return;
        }

        // Remove endorsement
        targetUser.skills[skillIndex].endorsments.splice(endorsementIndex, 1);
        await targetUser.save();

        res.status(200).json({ 
            message: 'Endorsement removed successfully',
            endorsements_count: targetUser.skills[skillIndex].endorsments.length
        });
    } catch (error) {
        next(error);
    }
};

export { addSkill, updateSkill, deleteSkill, getUserSections, endorseSkill, removeEndorsement };
