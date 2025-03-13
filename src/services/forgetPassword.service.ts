import nodemailer from 'nodemailer';



const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, // e.g. 'Gmail'
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


export const sendResetPasswordEmail = async (email: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset password',
    text: `reset password link:localhost:5174/reset-password`,
  };
  await emailTransporter.sendMail(mailOptions);
};