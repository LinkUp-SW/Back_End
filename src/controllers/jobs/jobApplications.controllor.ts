import { NextFunction, Request, Response } from "express";
import users from '../../models/users.model.ts';
import { validateTokenAndGetUser } from "../../utils/helper.ts";



export const ApplyForJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await validateTokenAndGetUser(req, res) as { _id: string };
        if (!user) return;


        // Get the organization with populated followers
        const jobApplication = await users.findById(user._id)
        .populate({
            path: "followers",
            select: "user_id bio.first_name bio.last_name bio.headline profile_photo location resume",
        });
        if (!jobApplication) return;
    
        res.status(200).json({ data: jobApplication });
    } catch (error) {
        next(error);
    }
}