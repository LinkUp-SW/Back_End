import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { UserRepository } from '../repositories/user.repository.ts';
const userRepo = new UserRepository()


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
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false },
  });


export async function generateUniqueId(firstName: string, lastName: string): Promise<string> {
    let id = firstName + "-" + lastName + Math.floor(Math.random() * 100);
    let attempt = 0;
    while(attempt < 10) {
      const user = await userRepo.findByUserId(id);
      if (!user) {
        return id;
      }
      id = firstName + "-" + lastName + Math.floor(Math.random() * 100);
      attempt++;
    }
    throw new Error("Unable to generate unique user id after 10 attempts");
}

export const isEmailTaken = async (email: string): Promise<boolean> => {
  const user = await userRepo.findByEmail(email);
  return Boolean(user);
};

