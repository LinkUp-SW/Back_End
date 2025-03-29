import { emailTransporter } from '../utils/helperFunctions.utils.ts';
import asyncHandler from '../middleware/asyncHandler.ts';
import twilio from 'twilio';

export const generateOTPCode = (length = 6): string => {
  // Generate a random 6 digit OTP code
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp; 
};


export const sendEmailOTP = async (email: string, otp: string): Promise<void> => {
  try{
    const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}. It will expire in 10 minutes.`,
  };
  await emailTransporter.sendMail(mailOptions);
  } catch (error){
    throw error;
  }
};

// SMS OTP Integration using Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSmsOTP = async (phone: string, otp: string): Promise<void> => {
  await twilioClient.messages.create({
    body: `Your OTP code is: ${otp}. It will expire in 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio number
    to: phone,
  });
};

