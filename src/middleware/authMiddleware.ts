import { Request, Response, NextFunction } from "express";
import tokenUtils from "../utils/token.utils.ts";
import { findUserByUserId, validateUserIdFromRequest, validateUserId } from "../utils/database.helper.ts";
import { getUserIdFromToken } from "../utils/helperFunctions.utils.ts";

export const authorizeUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
     // Validate token and retrieve viewerId and targetUser
    const viewerId = await getUserIdFromToken(req, res);
    if (!viewerId) return;

    // Retrieve the viewer's user document
    const viewerUser = await findUserByUserId(viewerId, res);
    if (!viewerUser) return;

    // Attach the user object to the request for use in controllers
    req.user = viewerUser;

    // If all checks pass, proceed to the next middleware
    next();
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({ message: error.message,success:false });
}
  else{
    console.error("Authorization error:", error);
    res.status(500).json({ message: "Authorization error", error });
  }
}
};