// Update email for specific user
import { Request, Response } from 'express';
import { UserRepository } from '../../repositories/user.repository.ts';
import { CustomError } from '../../utils/customError.utils.ts';
import { isEmailTaken } from '../../utils/helperFunctions.utils.ts';
import asyncHandler from '../../middleware/asyncHandler.ts';
import tokenUtils from '../../utils/token.utils.ts';

const userRepository = new UserRepository();

const  updateEmail = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const { email,password } = req.body;

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
  const decodedToken = tokenUtils.validateToken(token) as { userId: string };

  if (!decodedToken || !decodedToken.userId) {
      return res.status(401).json({ message: "Unauthorized" });
  }

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

  const user = await userRepository.findByUserId(decodedToken.userId);
  if (!user) {
    throw new CustomError('User not found', 404, 'USER_NOT_FOUND');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new CustomError('Password not matched', 401, 'PASSWORD_NOT_MATCHED');
  }

  await userRepository.updateEmail(decodedToken.userId, email);

  let user_updated = await userRepository.findByUserId(decodedToken.userId)
  return res.status(200).json({ message: 'Email updated successfully', user_updated_email: user_updated?.email  });
}); 


const getCurrentEmail = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
  const decodedToken = tokenUtils.validateToken(token) as { userId: string };

  if (!decodedToken || !decodedToken.userId) {
      return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await userRepository.findByUserId(decodedToken.userId);
  if (!user) {
    throw new CustomError('User not found', 404, 'USER_NOT_FOUND');
  }

  return res.status(200).json({ email: user.email });
}
);

export { updateEmail,getCurrentEmail };