import dotenv from "dotenv";
dotenv.config();

export const googleConfig = {
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  clientEmail: process.env.GOOGLE_CLIENT_EMAIL!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL!
};
