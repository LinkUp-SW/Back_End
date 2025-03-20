import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import {googleConfig} from "../../config/googleAuth.ts";
import dotenv from "dotenv";
dotenv.config();

export const googleAuth = (app: any) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleConfig.clientID || "",
        clientSecret: googleConfig.clientSecret || "",
        callbackURL: googleConfig.callbackURL || "",
      },
      (
        accessToken: any,
        refreshToken: any,
        profile: any,
        done: (arg0: null, arg1: any) => void
      ) => {
        console.log("Access token:", accessToken);
        console.log("Refresh token:", refreshToken);
        console.log("Profile:", profile);
        const user = { profile, tokens: { accessToken, refreshToken } };
        return done(null, user);
      }
    )
  );

  passport.serializeUser((user: any, done: (arg0: null, arg1: any) => void) => {
    done(null, user);
  });

  passport.deserializeUser(
    (user: any, done: (arg0: null, arg1: any) => void) => {
      done(null, user);
    }
  );
};

export default passport;