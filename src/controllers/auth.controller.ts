// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/asyncHandler.ts';
import { CustomError } from '../utils/customError.utils.ts';
import { JWT_CONFIG } from '../../config/jwt.config.ts';
import { AuthService } from '../services/authService.service.ts';

const authService = new AuthService();

/**
 * Local Email or Phone/Password Login
 */
const login = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new CustomError('Email and password are required', 400, 'MISSING_CREDENTIALS');
  }

  const { user, token } = await authService.login(email, password);
  // creating a cookie with the JWT token and sending it as a string in the response


  return res.status(200).json({ message: 'Login successful', user: { id: user._id, email: user.email }, cookie: {tokrn: token, maxAge: 3600000} }); // 1 hour expiration
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

  // Optionally, store tokens in session for further use
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

  // Optionally, update the session with the authenticated user's ID.
  if (req.session) {
    req.session.userId = user._id as string;
  }

  // Set the JWT as an HTTP-only cookie.
  res.cookie(JWT_CONFIG.COOKIE_NAME, token, {
    httpOnly: JWT_CONFIG.HTTP_ONLY,
    maxAge: 3600000, // 1 hour
  });

  return res.status(200).json({
    message: 'Google authentication successful',
    user: { id: user._id, email: user.email },
    tokens: req.session?.tokens,
  });
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
