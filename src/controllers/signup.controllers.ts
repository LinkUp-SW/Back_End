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
    const {firstName, lastName, email, password,
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
    
    const userId = await generateUniqueId(firstName, lastName);
    // Check if email is already taken
    // If email is taken, update the user's info
    const emailExists = await isEmailTaken(email.toLowerCase());
    if (emailExists) {
      const user = await userRepository.findByEmail(email.toLowerCase());
      if (!user) {
        throw new CustomError('User not found', 404);
      }
      user.bio.first_name = firstName;
      user.bio.last_name = lastName;
      user.password = password;
      user.bio.location.country_region = country;
      user.bio.location.city = city;
      user.is_student = isStudent;
      user.work_experience[0].title = jobTitle;
      user.education[0].school = school;
      user.education[0].start_date = schoolStartYear;
      user.education[0].end_date = schoolEndYear;
      user.is_16_or_above = is16OrAbove;
      user.bio.contact_info.birthday = birthDate;
      user.work_experience[0].employee_type = employmentType;
      user.work_experience[0].organization = recentCompany;
      await userRepository.update(user);
      return res.status(200).json({ message: 'User updated successfully', user });

    }

    const user = await userRepository.create(
      userId.toString(),
      firstName, lastName, email.toLowerCase(), password,
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

    const token = tokenFunctionalities.createToken({
            time: "1h",
            userID: user.user_id,
          });

    res.cookie(JWT_CONFIG.COOKIE_NAME, token, {
        httpOnly: JWT_CONFIG.HTTP_ONLY,
        maxAge: 3600000, // 1 hour,
      });

    res.cookie("linkup_user_id", user.user_id, {
        maxAge: 3600000,
        httpOnly: false,
      });
    res.status(201).json({ message: 'User created successfully', user });
});


export { verifyEmail, addUserStarterInfo};