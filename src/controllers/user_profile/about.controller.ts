import { Request, Response, NextFunction } from "express";
import users from "../../models/users.model.ts";
import { validateTokenAndUser , getUserIdFromToken} from "../../utils/helperFunctions.utils.ts";
import { findUserByUserId } from "../../utils/database.helper.ts";
import { handleProfileAccess } from "../../repositories/user.repository.ts";

// Add About
export const addUserAbout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const viewerId = await getUserIdFromToken(req, res);
    if (!viewerId) return;

    // Retrieve the viewer's user document
    const viewerUser = await findUserByUserId(viewerId, res);
    if (!viewerUser) return;
    if (viewerUser.about?.about) {
      res.status(400).json({ message: "About section already exists. Use update instead." });
      return;
    }

    const { about, skills } = req.body;

    viewerUser.about = {
      about,
      skills,
    };

    await viewerUser.save();

    res.status(200).json({ message: "About section added successfully", about: viewerUser.about });
  } catch (error) {
    next(error);
  }
};

// Update About
export const updateUserAbout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const viewerId = await getUserIdFromToken(req, res);
    if (!viewerId) return;

    // Retrieve the viewer's user document
    const viewerUser = await findUserByUserId(viewerId, res);
    if (!viewerUser) return;

    const { about, skills } = req.body;

    if (!viewerUser.about) {
      res.status(404).json({ message: "About section not found. Use add instead." });
      return;
    }

    viewerUser.about = {
      about,
      skills,
    };

    await viewerUser.save();

    res.status(200).json({ message: "About section updated successfully", about: viewerUser.about });
  } catch (error) {
    next(error);
  }
};

// Delete About
export const deleteUserAbout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const viewerId = await getUserIdFromToken(req, res);
    if (!viewerId) return;

    // Retrieve the viewer's user document
    const viewerUser = await findUserByUserId(viewerId, res);
    if (!viewerUser) return;


    if (!viewerUser.about) {
      res.status(404).json({ message: "About section not found." });
      return;
    }

    viewerUser.about = undefined; // Remove the about section

    await viewerUser.save();

    res.status(200).json({ message: "About section deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Get About
export const getUserAbout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await validateTokenAndUser(req, res);
    if (!result) return;

    const { viewerId, targetUser } = result;

    // Retrieve the viewer's user document
    const viewerUser = await findUserByUserId(viewerId, res);
    if (!viewerUser) return;

    const is_me = viewerUser.user_id.toString() === targetUser.user_id.toString();

    // Check if the target profile is public or private and if the viewer is connected to the target user
    const hasAccess = await handleProfileAccess(viewerId.toString(), targetUser.user_id.toString(), res);
    if (!hasAccess) return;

    if (!targetUser.about) {
      res.status(404).json({ message: "About section not found." });
      return;
    }

    res.status(200).json({ is_me: is_me , about: targetUser.about });
  } catch (error) {
    next(error);
  }
};