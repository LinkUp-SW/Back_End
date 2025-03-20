import { Request, Response, NextFunction } from 'express';
import { UserRepository } from '../repositories/user.repository.ts';
import { CustomError } from '../utils/customError.utils.ts';
import asyncHandler from '../middleware/asyncHandler.ts';
import { isEmailTaken } from '../utils/helperFunctions.utils.ts';


const verifyEmail = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
    const { email } = req.body;

    if (!email) {
      throw new CustomError('Email is required', 400);
    }

    const emailExists = await isEmailTaken(email);

    if (emailExists) {
      throw new CustomError('Email already exists', 400);
    }

    return res.status(200).json({ message: 'Email is available' });
  }
);


const addUserStarterInfo = asyncHandler(async(req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName, email, password,
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
      recentCompany } = req.body;
    const userRepository = new UserRepository();
    const user = await userRepository.create(
      firstName, lastName, email, password,
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
      recentCompany);

    res.status(201).json({ message: 'User created successfully', user });
});


export { verifyEmail, addUserStarterInfo};