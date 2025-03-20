// import { SessionData } from 'express-session';

// Extend the session interface to include our custom properties
declare module 'express-session' {
    interface SessionData {
      tokens?: {
        access_token: string;
        refresh_token: string;
        expiry_date: number;
      };
      userId?: string;
    }
  }

// Define Google user info interface
export interface GoogleUserInfo {
  id: string,
  email: string,
  verified_email: boolean,
  name: string,
  given_name: string,
  family_name: string
}