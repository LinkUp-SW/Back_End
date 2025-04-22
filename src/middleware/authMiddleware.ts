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
};

// auth middleware function for messaging routes
export const authorizeMessaging = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate token and extract user ID from the token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    const decodedToken = tokenUtils.validateToken(token) as { userId: string };

    if (!decodedToken || !decodedToken.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Attach the user ID to the request for use in controllers
    req.user = decodedToken.userId;
    req.params = req.params || {};

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Authorization error:", error);
    res.status(500).json({ message: "Authorization error", error });
  }
}

