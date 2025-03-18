import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { UserRepository } from '../repositories/user.repository.ts';
const userRepo = new UserRepository();

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



export function generateUniqueId(firstName: string, lastName: string): string {
  let id = firstName + "-" + lastName + Math.floor(Math.random() * 100);
  // Check if the ID already exists in the database
  // If it does, generate a new one
  // Repeat until a unique ID is found
  while(true){
    let user = userRepo.findByUserId(id);
    if (!user) {
      break;
    }
    id = firstName + "-" + lastName + Math.floor(Math.random() * 100);
  }
  return id;
}