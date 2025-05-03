import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../../middleware/asyncHandler.ts';
import { CustomError } from '../../utils/customError.utils.ts';
import { UserRepository } from '../../repositories/user.repository.ts';
import { generateUniqueId } from '../../utils/helperFunctions.utils.ts';
import tokenUtils from '../../utils/token.utils.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';
import { findUserByUserId } from '../../utils/database.helper.ts';

const userRepo = new UserRepository();

export const createAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    let userId = await getUserIdFromToken(req, res);
    if (!userId) return;
    // Check if the user is an admin
    const currentUser = await userRepo.findByUserId(userId);   
    if (!currentUser || currentUser.is_admin !== true) {
        throw new CustomError('Unauthorized: Only admins can create new admins', 403, 'UNAUTHORIZED');
    }
    
    const { firstName, lastName, email, password } = req.body;
    if (!lastName||!firstName || !email || !password) {
        throw new CustomError('Name, email, and password are required', 400, 'MISSING_CREDENTIALS');
    }
    email.toLowerCase();

    // Check if the user already exists
    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
        throw new CustomError('User already exists', 400, 'USER_ALREADY_EXISTS');
    }

    // Create a new admin user
    const newAdmin = await userRepo.createAdmin(
        await generateUniqueId(firstName, lastName),
        firstName,
        lastName,
        email,
        password);

    return res.status(201).json({ message: 'Admin created successfully', admin: newAdmin });
}
);