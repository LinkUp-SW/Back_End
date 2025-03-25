import { Request, Response } from "express";
import tokenUtils from "../utils/token.utils.ts";
import { validateUserIdFromRequest, findUserByUserId } from "../utils/database.helper.ts";


export const validateTokenAndGetUser = async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    const decodedToken = tokenUtils.validateToken(token) as { userId: string };

    if (!decodedToken || !decodedToken.userId) {
        res.status(401).json({ message: "Unauthorized" });
        return null;
    }

    const user = await findUserByUserId(decodedToken.userId, res);
    return user;
};

export const validateTokenAndUser = async (req: Request, res: Response): Promise<{ viewerId: string, userId: string, user: any } | null> => {
  // Validate token and extract user ID from the token
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
  const decodedToken = tokenUtils.validateToken(token) as { userId: string };

  if (!decodedToken || !decodedToken.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  const viewerId = decodedToken.userId;

  // Validate the user_id parameter from the request
  const userId = await validateUserIdFromRequest(req, res);
  if (!userId) return null;

  // Retrieve the user document
  const user = await findUserByUserId(userId, res);
  if (!user) return null;

  return { viewerId, userId, user };
};

export const getUserIdFromToken = async (req: Request, res: Response): Promise<string | null> => {
  // Validate token and extract user ID from the token
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    const decodedToken = tokenUtils.validateToken(token) as { userId: string };
    if (!decodedToken || !decodedToken.userId) {
      res.status(401).json({ message: "Unauthorized",success:false });
      return null;
    }
    const viewerId = decodedToken.userId;
  
    return viewerId;
};

export const validateFileUpload = (req: Request, res: Response): string | null => {
  // Ensure a file was uploaded
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
    return null;
  }

  // Retrieve the Cloudinary URL from the file uploaded by multer
  const profilePictureUrl = req.file.path;
  if (!profilePictureUrl) {
    res.status(400).json({ message: "Error processing file upload" });
    return null;
  }

  return profilePictureUrl;
};