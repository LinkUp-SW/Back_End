import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/users.model.ts'; 


const signup = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { email, password, name } = req.body;

    // Validate request payload
    if (!email || !password ) {
      return res.status(400).json({ message: 'Email or Username and password are required' });
    }

    // Check if a user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({ email, password: hashedPassword, name: name ? name : '' }); // save email and password and name if provided else save email and password only

    return res.status(201).json({
      message: 'Signup successful',
      user: { email: newUser.email },
    });
  } catch (error) {
    next(error);
    return res.status(500).json({ message: 'Server error', error });
  }
};

export { signup };