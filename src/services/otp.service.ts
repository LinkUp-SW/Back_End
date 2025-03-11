import nodemailer from 'nodemailer';
import twilio from 'twilio';

export const generateOTPCode = (length = 6): number => {
  // Generate a random 6 digit OTP code
  return Math.floor(Math.random() * (10 ** length));
};

// Email OTP Integration using Nodemailer
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, // e.g. 'Gmail'
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmailOTP = async (email: string, otp: number): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}. It will expire in 10 minutes.`,
  };
  await emailTransporter.sendMail(mailOptions);
};

// SMS OTP Integration using Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSmsOTP = async (phone: string, otp: number): Promise<void> => {
  await twilioClient.messages.create({
    body: `Your OTP code is: ${otp}. It will expire in 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio number
    to: phone,
  });
};

// Combined function to send OTP via your preferred channels (can be one or both)
export const sendOTPCode = async (
  email: string,
  phone: string | null,
  otp: number
): Promise<void> => {
  const promises = [sendEmailOTP(email, otp)];
  if (phone) {
    promises.push(sendSmsOTP(phone, otp));
  }
  await Promise.all(promises);
};