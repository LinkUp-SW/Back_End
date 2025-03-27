import { NextFunction, Request, Response } from "express";
import { ObjectId } from "bson";
import { validateTokenAndGetUser } from "../../utils/helper.ts";
import { processMediaArray } from "../../services/cloudinaryService.ts";

const addSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { name, used_where } = req.body;

        const newSkill = {
            _id: new ObjectId().toString(),
            name,
            endorsments: [],
            used_where: used_where || [],
        };

        user.skills.push(newSkill);
        await user.save();

        res.status(200).json({ message: 'Skill added successfully', skill: newSkill });
    } catch (error) {
        next(error);
    }
};

const updateSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res);
        if (!user) return;

        const { skillId } = req.params;
        const { name, used_where } = req.body;

        const skillIndex = user.skills.findIndex((skill) => skill._id === skillId);
        if (skillIndex === -1) {
            res.status(404).json({ message: 'Skill not found' });
            return;
        }
        
        const currentEndorsments = user.skills[skillIndex].endorsments;

        user.skills[skillIndex] = {
            _id: skillId,
            name,
            endorsments: currentEndorsments,
            used_where: used_where || [],
        };

        await user.save();

        res.status(200).json({ message: 'Skill updated successfully', skill: user.skills[skillIndex] });
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

export { addSkill, updateSkill, deleteSkill };
