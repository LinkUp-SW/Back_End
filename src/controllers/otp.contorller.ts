import { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { generateOTPCode, sendOTPCode } from '../services/otp.service.ts';


declare module 'express-session' {
  interface SessionData {
    otp: number;
    otpEmail: string;
    otpExpires: number;
  }
}

const OTP_EXPIRATION_MINUTES = 10;

const generateOTP = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { email, phone } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    // Generate a 6-digit OTP code 
    const otpCode = generateOTPCode(); 
    let userPhone = phone;
    await sendOTPCode(email, userPhone, otpCode);
    if (req.session) {
      req.session.otp = otpCode;
      req.session.otpExpires = Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000;
      req.session.otpEmail = email;
    }
    return res.status(200).json({ message: 'OTP has been sent to your email' });
  } catch (error) {
    next(error);
    return res.status(500).json({ message: 'Server error', error });
  }
};

const verifyOTP = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }
    if (req.session && req.session.otp && req.session.otpEmail === email && parseInt(otp, 10) === req.session.otp) {
        if (req.session.otpExpires && Date.now() > req.session.otpExpires) {
            return res.status(401).json({ message: 'OTP expired' });
          }
      req.session.otp = undefined;
      req.session.otpEmail = undefined;
      return res.status(200).json({ message: 'OTP verified successfully' });
    }
    return res.status(401).json({ message: 'Invalid OTP' });
  } catch (error) {
    next(error);
    return res.status(500).json({ message: 'Server error', error });
  }
};

export { generateOTP, verifyOTP };