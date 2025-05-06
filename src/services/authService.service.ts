import { CustomError } from "../utils/customError.utils.ts";
import { UserRepository } from "../repositories/user.repository.ts";
import tokenFunctionalities from "../utils/token.utils.ts";
import { JWT_CONFIG } from "../../config/jwt.config.ts";
import { Request, Response, NextFunction } from "express";
import {
  oauth2Client,
  getGoogleUserInfo,
} from "../services/googleAuth.service.ts";
import { generateHashedPassword } from "../utils/helperFunctions.utils.ts";
import { generateUniqueId } from "../utils/helperFunctions.utils.ts";

export class AuthService {
  private userRepo = new UserRepository();

  // Local login: validates email and password, then generates a JWT token.
  async login(email: string, password: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user || !(await user.comparePassword(password))) {
      throw new CustomError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }
    const token = tokenFunctionalities.createToken({
      time: "1h",
      userID: user.user_id as string,
    });
    return { token, user };
  }

  // Google login: processes the passportUser from Passport's Google strategy.
  async googleLogin(passportUser: any) {
    if (!passportUser) {
      throw new CustomError(
        "Google authentication failed",
        401,
        "GOOGLE_AUTH_FAILED"
      );
    }

    const googleProfile = passportUser.profile;
    const accessToken = passportUser.tokens?.accessToken;
    if (!accessToken || !googleProfile) {
      throw new CustomError(
        "Incomplete Google user data",
        400,
        "INCOMPLETE_GOOGLE_DATA"
      );
    }

    const googleUserInfo = await getGoogleUserInfo(accessToken);
    if (!googleUserInfo) {
      throw new CustomError(
        "Failed to fetch Google user info",
        500,
        "GOOGLE_INFO_FETCH_FAILED"
      );
    }
    console.log("Google user info:", googleUserInfo);
    // Check if a user with the Google email exists in the DB.
    let user = await this.userRepo.findByEmail(googleUserInfo.email);
    if (user) {
      const token = tokenFunctionalities.createToken({
        time: "1h",
        userID: user.user_id,
      });
      user.is_verified = true;
      await user.save();
      return { token, user };
    } else {
      // If user doesn't exist, create a new record.
      let user_id = await generateUniqueId(
        googleUserInfo.given_name,
        googleUserInfo.family_name
      );
      user = await this.userRepo.createGoogleUser(
        user_id as unknown as string,
        googleUserInfo.email.toLowerCase(),
        googleUserInfo.given_name,
        googleUserInfo.family_name,
        generateHashedPassword() // Use a generated or placeholder password.
      );
      user.is_verified = true;
      await user.save();
      const token = tokenFunctionalities.createToken({
        time: "1h",
        userID: user.user_id,
      });
      return { token, user };
    }
  }

  // Google logout: revokes the Google access token, destroys the session, and clears the cookie.
  async googleLogout(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.tokens && req.session.tokens.access_token) {
      await oauth2Client.revokeToken(req.session.tokens.access_token);
    }

    req.session?.destroy((err: Error) => {
      if (err) {
        return next(
          new CustomError(
            "Session destruction error",
            500,
            "SESSION_DESTROY_ERROR"
          )
        );
      }
    });

    res.clearCookie(JWT_CONFIG.COOKIE_NAME);
    res.clearCookie("linkup_user_id");
    return res.status(200).json({ message: "Google logout successful" });
  }

  // Regular logout: simply clears the authentication cookie.
  async logout(req: Request, res: Response) {
    const isProduction = process.env.NODE_ENV === "production";

    // Clear JWT cookie
    res.clearCookie(JWT_CONFIG.COOKIE_NAME, {
      httpOnly: JWT_CONFIG.HTTP_ONLY,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      domain: isProduction ? process.env.DOMAIN : undefined,
    });

    res.clearCookie("linkup_user_type", {
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      domain: isProduction ? process.env.DOMAIN : undefined,
    });

    // Clear user ID cookie
    res.clearCookie("linkup_user_id", {
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      domain: isProduction ? process.env.DOMAIN : undefined,
    });

    return res.status(200).json({ message: "Logout successful" });
  }
}
