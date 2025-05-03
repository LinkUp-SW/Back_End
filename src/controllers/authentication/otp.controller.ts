import { Request, Response, NextFunction } from 'express';
import { generateOTPCode, sendEmailOTP } from '../../services/otp.service.ts';
import asyncHandler from '../../middleware/asyncHandler.ts';
import { CustomError } from '../../utils/customError.utils.ts';
import tokenUtils  from '../../utils/token.utils.ts';
import { UserRepository } from '../../repositories/user.repository.ts';
import { getUserIdFromToken } from '../../utils/helperFunctions.utils.ts';

const userRepository = new UserRepository();

declare module 'express-session' {
  interface SessionData {
    otp: string;
    otpExpires: number;
    otpEmail: string;
  }
}

const OTP_EXPIRATION_MINUTES = 10;

const generateOTP = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const email = req.body.email.toLowerCase();

  if (!email) {
      throw new CustomError('Email is required', 400, 'MISSING_EMAIL');
  }

  // Generate a 6-digit OTP code
  const otpCode = generateOTPCode();

  await sendEmailOTP(email, otpCode);

  if (req.session) {
      req.session.otp = otpCode;
      req.session.otpExpires = Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000;
      req.session.otpEmail = email;
  } else {
      throw new CustomError('Session not found', 500, 'SESSION_ERROR');
  }

  return res.status(200).json({ message: 'OTP has been sent to your email' , otp: otpCode });
});

const verifyOTP = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  let { otp, email, update } = req.body;
  email = email.toLowerCase();
  
  if (!otp) {
      throw new CustomError('OTP is required', 400, 'MISSING_OTP');
  }

  if (!req.session) {
      throw new CustomError('Session not found', 500, 'SESSION_ERROR');
  }

  if (!req.session.otp || !req.session.otpEmail || email !== req.session.otpEmail) {
    throw new CustomError('Invalid OTP or email', 401, 'INVALID_OTP_MAIL');
}

  if (req.session.otpExpires && Date.now() > req.session.otpExpires) {
      req.session.otp = undefined;
      throw new CustomError('OTP has expired', 401, 'EXPIRED_OTP');
  }

  if (String(req.session.otp) !== String(otp)) {
      req.session.otp = undefined;
      throw new CustomError('Invalid OTP', 401, 'INVALID_OTP');
  }

  req.session.otp = undefined;
  
  let user: any;
  

  if (update) {
    const userId = await getUserIdFromToken(req, res);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    user = await userRepository.findByUserId(userId);
    if (!user) {
      throw new CustomError('User not found', 404, 'USER_NOT_FOUND');
    }
    const tempEmail = await userRepository.findByTempEmail(email);
    if (!tempEmail) {
      throw new CustomError('Temporary email not found', 404, 'TEMP_EMAIL_NOT_FOUND');
    }
    await userRepository.updateEmail(user.user_id, tempEmail.temp_email);
    await userRepository.deleteTempEmail(user.user_id);
    user.is_verified = true;
    await user.save();
    return res.status(200).json({ message: 'OTP verified successfully and email updated', isVerified: true });
  }

  user = await userRepository.findByEmail(email);
  if (!user) {
      throw new CustomError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.cookie("linkup_user_id", user.user_id, {
      maxAge: 3600000,
      httpOnly: false,
    });

  return res.status(200).json({ message: 'OTP verified successfully' });
});


export { generateOTP, verifyOTP };