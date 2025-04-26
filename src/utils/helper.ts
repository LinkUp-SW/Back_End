import { Request, Response } from "express";
import tokenUtils from "../utils/token.utils.ts";
import { validateUserIdFromRequest, findUserByUserId, checkProfileAccess  } from "../utils/database.helper.ts";
import Organization, { categoryTypeEnum } from "../models/organizations.model.ts";
import organizations from "../models/organizations.model.ts";

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
export const validateTokenAndUser = async (req: Request, res: Response): Promise<{ viewerId: string,  targetUser: any } | null> => {
  try{
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

  // Retrieve the target user document
  const targetUser = await findUserByUserId(userId, res);
  if (!targetUser) return null;


  return { viewerId, targetUser };
} catch (error) {
  throw error;
}
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

/**
 * Search for organizations of a specific category type
 * @param query The search query
 * @param categoryType The category type to search within
 * @returns Array of matching organizations
 */
export const searchOrganizationsByType = async (query: string, categoryType: categoryTypeEnum) => {
  return await Organization.find({
    category_type: categoryType,
    name: { $regex: query, $options: 'i' }
  }).select('_id name logo').limit(10);
};

/**
 * Search for organizations across all category types
 * @param query The search query
 * @returns Array of matching organizations
 */
export const searchAllOrganizations = async (query: string) => {
  return await Organization.find({
    name: { $regex: query, $options: 'i' }
  }).select('_id name logo category_type').limit(10);
};

/**
 * Fetches a company profile by ID and validates its existence
 * @param companyId The ID of the company to fetch
 * @param res Express response object
 * @returns The company profile or null if not found
 */
export const getCompanyProfileById = async (companyId: string, res: Response) => {
  const companyProfile = await organizations.findById(companyId);
  
  if (!companyProfile) {
      res.status(404).json({ message: "Company profile not found" });
      return null;
  }
  
  return companyProfile;
};

/**
* Checks if a user is an admin of a company
* @param companyProfile The company profile object
* @param userId The ID of the user to check
* @param res Express response object
* @returns Boolean indicating admin status, or null if unauthorized
*/
export const validateUserIsCompanyAdmin = (companyProfile: any, userId: string, res: Response) => {
  const isAdmin = companyProfile.admins.some((adminId: string) => adminId.toString() === userId.toString());
  
  if (!isAdmin) {
      res.status(403).json({ message: "Unauthorized: Only company admins can perform this action" });
      return null;
  }
  
  return isAdmin;
};