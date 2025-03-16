import { Request, Response, NextFunction } from 'express';
import { UserRepository } from '../repositories/user.repository.ts';
import { CustomError } from '../utils/customError.utils.ts';
import asyncHandler from '../middleware/asyncHandler.ts';

const verifyEmail = asyncHandler (async(req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    const userRepository = new UserRepository();
    const user = await userRepository.findByEmail(email);
    if (user) {
        throw new CustomError('Email already exists', 400);
    }
    res.status(200).json({ message: 'Email is available' });

});

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
      employmentType,
      recentCompany);

    res.status(201).json({ message: 'User created successfully', user });
});


export { verifyEmail, addUserStarterInfo};