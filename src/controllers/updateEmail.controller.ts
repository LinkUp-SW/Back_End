// Update email for specific user
import { Request, Response } from 'express';
import { UserRepository } from '../repositories/user.repository.ts';
import { CustomError } from '../utils/customError.utils.ts';
import { isEmailTaken } from '../utils/helperFunctions.utils.ts';
import asyncHandler from '../middleware/asyncHandler.ts';
import tokenUtils from '../utils/token.utils.ts';

const userRepository = new UserRepository();

const  updateEmail = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const { email, token } = req.body;

  let userId = tokenUtils.validateToken(token);

  if (!email) {
    throw new CustomError('Email is required', 400, 'EMAIL_REQUIRED');
  }

  const emailExists = await isEmailTaken(email);

  if (emailExists) {
    throw new CustomError('Email already exists', 401, 'EMAIL_EXISTS');
  }

  await userRepository.updateEmail(userId, email);

  let user_updated = await userRepository.findByUserId(userId)

  return res.status(200).json({ message: 'Email updated successfully', user_updated_email: user_updated?.email  });
}); 

export { updateEmail };