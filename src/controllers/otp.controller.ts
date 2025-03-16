import { Request, Response, NextFunction } from 'express';
import { generateOTPCode, sendEmailOTP } from '../services/otp.service.ts';
import asyncHandler from '../middleware/asyncHandler.ts';
import { CustomError } from '../utils/customError.utils.ts';
import tokenUtils  from '../utils/token.utils.ts';
import { UserRepository } from '../repositories/user.repository.ts';

declare module 'express-session' {
  interface SessionData {
    otp: number;
    otpExpires: number;
  }
}

const OTP_EXPIRATION_MINUTES = 10;

const generateOTP = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const { email } = req.body;

    if (!email) {
      throw new CustomError('Email is required', 400, 'MISSING_EMAIL');
    }
    // Generate a 6-digit OTP code 
    const otpCode = generateOTPCode(); 

    await sendEmailOTP(email, otpCode);

    if (req.session) {
      req.session.otp = otpCode;
      req.session.otpExpires = Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000;
    }

    return res.status(200).json({ message: 'OTP has been sent to your email' });

  });

const verifyOTP = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {

    const { otp, token } = req.body;
    if (!otp) {
      throw new CustomError('OTP is required', 400, 'MISSING_OTP');
    }
    if (req.session && req.session.otp && parseInt(otp, 10) === req.session.otp) {
        if (req.session.otpExpires && Date.now() > req.session.otpExpires) {
            throw new CustomError('OTP has expired', 401, 'EXPIRED_OTP');
          }
      req.session.otp = undefined;
      let user1_id = tokenUtils.validateToken(token);
      if (!user1_id) {
        throw new CustomError('Invalid token', 401, 'INVALID_TOKEN');
      }
      const userRepository = new UserRepository();
      const user = await userRepository.findById(user1_id as string);
      if (!user) {
        throw new CustomError('User not found', 404, 'USER_NOT_FOUND');
      }
      user.is_verified = true;
      await user.save();
      return res.status(200).json({ message: 'OTP verified successfully' });
    }
    throw new CustomError('Invalid OTP', 401, 'INVALID_OTP');

});

export { generateOTP, verifyOTP };