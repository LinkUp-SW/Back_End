import { emailTransporter } from "../utils/helperFunctions.utils.ts";


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