import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import users from '../models/users.model.ts';
import { JWT_CONFIG } from '../../config/jwt.config.ts';

const login = async (req: Request, res: Response,next: NextFunction): Promise<Response | void> =>{
  try {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await users.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id },
      JWT_CONFIG.SECRET as jwt.Secret,
      { expiresIn: JWT_CONFIG.EXPIRES_IN } as SignOptions
    );  // use new token creation function

    res.cookie(JWT_CONFIG.COOKIE_NAME, token, {
      httpOnly: JWT_CONFIG.HTTP_ONLY,
      maxAge: 3600000 // 1 hour
    });

    res.status(200).json({ message: 'Login successful',user: { id: user._id, email: user.email } });

  } catch (error) {
    next(error);
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

const logout = (req: Request, res: Response) => {
  res.clearCookie(JWT_CONFIG.COOKIE_NAME);
  res.status(200).json({ message: 'Logout successful' });
};

export { login, logout };