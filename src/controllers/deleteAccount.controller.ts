import { Request, Response } from 'express';
import { UserRepository } from '../repositories/user.repository.ts';
import { CustomError } from '../utils/customError.utils.ts';
import asyncHandler from '../middleware/asyncHandler.ts';
import tokenUtils from '../utils/token.utils.ts';

const userRepository = new UserRepository();

export const deleteAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    
    if (!token) {
      throw new CustomError('Authentication token is required', 400);
    }

    // Validate token and extract the user ID.
    // This function should throw an error if the token is invalid.
    const userId = tokenUtils.validateToken(token);

    // Delete the user account from the database.
    // This method should delete the user by their ID and return the deleted user data or a confirmation.
    const deletedUser = await userRepository.deleteAccount(userId);
    
    res.status(200).json({
      message: 'Account deleted successfully',
      user: deletedUser,
    });
  } catch (error) {
    // Return error message and appropriate status code.
    res.status((error as CustomError).statusCode || 400).json({
      error: (error as Error).message,
    });
  }
});
