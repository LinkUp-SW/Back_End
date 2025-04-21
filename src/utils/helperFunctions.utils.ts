import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { UserRepository } from '../repositories/user.repository.ts';
import { Request, Response } from "express";
import tokenUtils from "../utils/token.utils.ts";
import { validateUserIdFromRequest, findUserByUserId } from "../utils/database.helper.ts";
const userRepo = new UserRepository()

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
  try{
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
  } catch (error) {
    res.status(500).json({ message: "Internal server error",success:false });
    return null;
  }
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
 * Generates a random password and hashes it using SHA-256.
 * @returns {string} The hashed password.
 */
export function generateHashedPassword(): string {
    // Generate a random password
    const randomPassword = crypto.randomBytes(16).toString('hex');
    
    // Hash the password using SHA-256
    const hash = crypto.createHash('sha256');
    hash.update(randomPassword);
    const hashedPassword = hash.digest('hex');
    
    return hashedPassword;
}

export const emailTransporter = nodemailer.createTransport({
    service:"gmail",
    host: "smtp.gmail.com",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false },
  });


export async function generateUniqueId(firstName: string, lastName: string): Promise<string> {
    let id = firstName + "-" + lastName + Math.floor(Math.random() * 100);
    let attempt = 0;
    while(attempt < 10) {
      const user = await userRepo.findByUserId(id);
      if (!user) {
        return id;
      }
      id = firstName + "-" + lastName + Math.floor(Math.random() * 100);
      attempt++;
    }
    throw new Error("Unable to generate unique user id after 10 attempts");
}

export const isEmailTaken = async (email: string): Promise<boolean> => {
  const user = await userRepo.findByEmail(email);
  return Boolean(user);
};

