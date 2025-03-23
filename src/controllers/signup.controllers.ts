import { Request, Response, NextFunction } from 'express';
import { UserRepository } from '../repositories/user.repository.ts';
import { CustomError } from '../utils/customError.utils.ts';
import asyncHandler from '../middleware/asyncHandler.ts';
import { generateUniqueId, isEmailTaken } from '../utils/helperFunctions.utils.ts';
import tokenFunctionalities from '../utils/token.utils.ts';
import { JWT_CONFIG } from '../../config/jwt.config.ts';


const verifyEmail = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
    const { email } = req.body;

    if (!email) {
      throw new CustomError('Email is required', 400);
    }

    const emailExists = await isEmailTaken(email.toLowerCase());

    if (emailExists) {
      throw new CustomError('Email already exists', 400);
    }

    return res.status(200).json({ message: 'Email is available' });
  }
);

 
const addUserStarterInfo = asyncHandler(async(req: Request, res: Response, next: NextFunction) => {
  const {
    firstName, 
    lastName, 
    email, 
    password,
    country,
    city,
    isStudent,
    jobTitle,
    school,
    schoolStartYear,
    schoolEndYear,
    is16OrAbove,
    birthDate,
    employmentType,
    recentCompany 
  } = req.body;

  // Validate essential fields
  if (!firstName || !lastName || !email || !password || !country || !city) {
    throw new CustomError('Required fields missing', 400);
  }
  
  const userRepository = new UserRepository();
  
  // Check if email already exists
  const emailExists = await isEmailTaken(email.toLowerCase());
  if (emailExists) {
    const existingUser = await userRepository.findByEmail(email.toLowerCase());
    if (!existingUser) {
      throw new CustomError('User not found', 404);
    }
    
    // Update the existing user with the new information - use existing user ID
    const updatedUser = await userRepository.update(
      existingUser.user_id,  // Use existing user_id instead of creating a new one
      firstName, 
      lastName, 
      email.toLowerCase(), 
      password,
      country,
      city,
      isStudent,
      jobTitle,
      school,
      schoolStartYear,
      schoolEndYear,
      is16OrAbove,
      birthDate ? new Date(birthDate) : null,
      employmentType,
      recentCompany
    );

    if (!updatedUser) {
      throw new CustomError('Failed to update user', 500);
    }

      const token = tokenFunctionalities.createToken({
        time: "1h",
        userID: updatedUser.user_id,
      });

      // Set cookies and return response
      res.cookie(JWT_CONFIG.COOKIE_NAME, token, {
        httpOnly: JWT_CONFIG.HTTP_ONLY,
        maxAge: 3600000, // 1 hour
      });

      res.cookie("linkup_user_id", updatedUser.user_id, {
        maxAge: 3600000,
        httpOnly: false,
      });
      
      return res.status(200).json({ 
        message: 'Login successful',
        user: { 
          id: updatedUser.user_id, 
          email: updatedUser.email, 
          isVerified: updatedUser.is_verified }});
    }

    // Create a new user
    const userId = await generateUniqueId(firstName, lastName);

    const newUser = await userRepository.create(
      userId.toString(),
      firstName, 
      lastName, 
      email.toLowerCase(), 
      password,
      country,
      city,
      isStudent,
      jobTitle,
      school,
      schoolStartYear,
      schoolEndYear,
      is16OrAbove,
      birthDate ? new Date(birthDate) : null,
      employmentType,
      recentCompany
    );

    const token = tokenFunctionalities.createToken({
      time: "1h",
      userID: newUser.user_id,
    });

    // Set cookies and return response
    res.cookie(JWT_CONFIG.COOKIE_NAME, token, {
      httpOnly: JWT_CONFIG.HTTP_ONLY,
      maxAge: 3600000, // 1 hour
    });

    res.cookie("linkup_user_id", newUser.user_id, {
      maxAge: 3600000,
      httpOnly: false,
    });
    
    return res.status(200).json({ 
      message: 'Login successful',
      user: { 
        id: newUser.user_id, 
        email: newUser.email, 
        isVerified: newUser.is_verified }});
});

export { verifyEmail, addUserStarterInfo };