import { Request, Response } from 'express';
import { UserRepository } from '../../repositories/user.repository.ts';
import { CustomError } from '../../utils/customError.utils.ts';
import asyncHandler from '../../middleware/asyncHandler.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';

const userRepository = new UserRepository();

export const deleteAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    let userId = await getUserIdFromToken(req, res);
    if (!userId) return;

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


export const testDeleteAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      throw new CustomError('Email is required', 400);
    }

    // Delete the user account from the database.
    let user = await userRepository.findByEmail(email);
    if (!user) {
      throw new CustomError('User not found', 404);
    }
    await userRepository.deleteAccount(user.user_id);
    
    res.status(200).json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    // Return error message and appropriate status code.
    res.status((error as CustomError).statusCode || 400).json({
      error: (error as Error).message,
    });
  }

});