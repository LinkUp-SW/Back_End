// Update email for specific user
import { Request, Response } from 'express';
import { UserRepository } from '../../repositories/user.repository.ts';
import { CustomError } from '../../utils/customError.utils.ts';
import { isEmailTaken,getUserIdFromToken  } from '../../utils/helperFunctions.utils.ts';
import asyncHandler from '../../middleware/asyncHandler.ts';
import tokenUtils from '../../utils/token.utils.ts';

const userRepository = new UserRepository();

const  updateEmail = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const { email,password } = req.body;

  let userId = await getUserIdFromToken(req, res);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  if (!email) {
    throw new CustomError('Email is required', 400, 'EMAIL_REQUIRED');
  }

  const emailExists = await isEmailTaken(email);

  if (emailExists) {
    throw new CustomError('Email already exists', 401, 'EMAIL_EXISTS');
  }

  if (!password) {
    throw new CustomError('Password is required', 400, 'PASSWORD_REQUIRED');
  }

  const user = await userRepository.findByUserId(userId);
  if (!user) {
    throw new CustomError('User not found', 404, 'USER_NOT_FOUND');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new CustomError('Password not matched', 401, 'PASSWORD_NOT_MATCHED');
  }

  //creating a temp object in the database to store the new email
  const tempEmail = await userRepository.createTempEmail(userId, email);
  if (!tempEmail) {
    throw new CustomError('Failed to create temp email', 500, 'TEMP_EMAIL_CREATION_FAILED');
  }

  return res.status(200).json({ message: 'Temp email created successfully', tempEmail: tempEmail.temp_email, expiry: tempEmail.temp_email_expiry });
}); 


const getCurrentEmail = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  let userId = await getUserIdFromToken(req, res);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const user = await userRepository.findByUserId(userId);
  if (!user) {
    throw new CustomError('User not found', 404, 'USER_NOT_FOUND');
  }

  return res.status(200).json({ email: user.email });
}
);

export { updateEmail,getCurrentEmail };