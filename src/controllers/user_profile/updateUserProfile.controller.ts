import { Request, Response, NextFunction } from 'express';
import User from '../../models/users.model.ts';
import { validateTokenAndGetUser } from '../../utils/helper.ts';

const updateUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const user = await validateTokenAndGetUser(req, res);
      if (!user) return;
  
      const { bio, industry, profile_photo, cover_photo, resume, phone_number, country_code } = req.body;
        
      const userId = user._id;
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, industry, profile_photo, cover_photo, resume, phone_number, country_code },
        { new: true, runValidators: true }
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      return res.status(200).json({ message: 'User profile updated successfully', user: updatedUser });
    } catch (error) {
      next(error);
      return res.status(500).json({ message: 'Server error', error });
    }
};

export { updateUserProfile };