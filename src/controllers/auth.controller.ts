// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler.ts';
import { CustomError } from '../utils/customError.utils.ts';
import { JWT_CONFIG } from '../../config/jwt.config.ts';
import { AuthService } from '../services/authService.service.ts';
import { UserRepository } from '../repositories/user.repository.ts';

const authService = new AuthService();
const userRepository = new UserRepository();

/**
 * Local Email or Phone/Password Login
 */
const login = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new CustomError('Email and password are required', 400, 'MISSING_CREDENTIALS');
  }
  email.toLowerCase();

  const { user, token } = await authService.login(email, password);

  res.cookie(JWT_CONFIG.COOKIE_NAME, token, {
    httpOnly: JWT_CONFIG.HTTP_ONLY,
    maxAge: 3600000, // 1 hour,
  });


  return res.status(200).json({ message: 'Login successful', user: { id: user.user_id, email: user.email, isVerified: user.is_verified }}); // 1 hour expiration
});

/**
 * Google OAuth Callback/Login Endpoint
 * 
 * This endpoint is called by Passport after successful Google authentication.
 * Passport populates req.user with an object of the form:
 * { profile: { ... }, tokens: { accessToken, refreshToken } }
 */
const googleCallback = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const passportUser = req.user as { profile: any; tokens: { accessToken: string; refreshToken: string } };
  if (!passportUser) {
    throw new CustomError('Google authentication failed', 401, 'GOOGLE_AUTH_FAILED');
  }
  
  // Store the Google access token in the session.
  if (req.session) {
    req.session.tokens = {
      access_token: passportUser.tokens?.accessToken,
      refresh_token: passportUser.tokens?.refreshToken,
      expiry_date: Date.now() + 3600000, // 1 hour expiration
    };
  }

  // Delegate the Google login logic to AuthService,
  // which handles user lookup/creation and token generation.
  const { user, token } = await authService.googleLogin(passportUser);

 

  // Store the user ID in the session.
  if (req.session) {
    req.session.userId = user.user_id as unknown as string; // Cast to string
  }

  // Set the JWT as an HTTP-only cookie.
  res.cookie(JWT_CONFIG.COOKIE_NAME, token, {
    httpOnly: JWT_CONFIG.HTTP_ONLY,
    maxAge: 3600000, // 1 hour,
  });


  const userCheck = await userRepository.findByEmail(user.email);

  if (!userCheck?.bio?.location) {
    
    return res.status(500).json({ message: 'User not found' });

  }

  if (Object.keys(userCheck.bio.location).length !== 0 && Object.keys(userCheck.bio.location).includes('country_region')) {
    res.cookie("linkup_user_id", userCheck.user_id, {
      maxAge: 3600000,
      httpOnly: false,
    });
    return res
      .status(200)
      .redirect(`${process.env.FRONTEND_REDIRECT_URL}/feed`);
  } else {
    res.cookie(
      "linkup_user_data",
      JSON.stringify({
        user_id: user.user_id,
        firstName: user.bio.first_name,
        lastName: user.bio.last_name,
        email: user.email.toLowerCase(),
        password: user.password,
        isVerified: user.is_verified,
      }),
      {
        httpOnly: false,
        maxAge: 3600000,
        sameSite: "lax",
        secure: false,
      }
    );
    return res.redirect(`${process.env.FRONTEND_REDIRECT_URL}/signup/location`);
  }

});

/**
 * Google Logout Endpoint
 * 
 * Revokes the Google access token (if present) and clears the session and cookie.
 */
const googleLogout = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  await authService.googleLogout(req, res, next);
});

/**
 * Regular Logout Endpoint (for local authentication)
 */
const logout = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  await authService.logout(req, res);
});

export { login, googleCallback, googleLogout, logout };
