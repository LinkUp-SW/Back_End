import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

/**
 * Generates a random password and hashes it using SHA-256.
 * @returns {string} The hashed password.
 */
export function generateHashedPassword(): string {
    // Generate a random password
    const randomPassword = crypto.randomBytes(16).toString('hex');
    
    // Hash the password using SHA-256
    const hash = crypto.createHash('sha256');
    hash.update(randomPassword);
    const hashedPassword = hash.digest('hex');
    
    return hashedPassword;
}

export const emailTransporter = nodemailer.createTransport({
    service:"gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false },
  });