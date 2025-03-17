import { Request, Response, NextFunction } from "express";
import tokenUtils from "../utils/token.utils.ts";
import { validateUserIdFromRequest, findUserByUserId } from "../utils/database.helper.ts";

export const authorizeUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate token and extract user ID from the token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    const decodedToken = tokenUtils.validateToken(token) as { userId: string };

    if (!decodedToken || !decodedToken.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const viewerId = decodedToken.userId;

    // Validate the user_id parameter from the request
    const userId = await validateUserIdFromRequest(req, res);
    if (!userId) return;

    // Retrieve the user document
    const user = await findUserByUserId(userId, res);
    if (!user) return;

    // Ensure the viewer is the same as the user (only the user can upload their own profile picture)
    if (viewerId !== userId) {
      res.status(403).json({ message: "You are not authorized to upload for this user." });
      return;
    }

    // If all checks pass, proceed to the next middleware
    next();
  } catch (error) {
    console.error("Authorization error:", error);
    res.status(500).json({ message: "Authorization error", error });
  }
};