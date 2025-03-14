import { error } from 'console';
import nodemailer from 'nodemailer';



const emailTransporter = nodemailer.createTransport({
  service:"gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
});

export const sendResetPasswordEmail = async (email: string,resetLink: string): Promise<void> => {
  try{
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset password',
    text: `reset password link:${resetLink}`,
  };
  await emailTransporter.sendMail(mailOptions);
}catch (error){
  throw error;
}
};