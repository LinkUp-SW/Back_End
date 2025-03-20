import jwt, { SignOptions } from "jsonwebtoken";
import { JWT_CONFIG } from "../../config/jwt.config.ts";

interface createTokenInterface {
  time: string;
  userID: string;
}

const createToken = ({ time, userID }: createTokenInterface): string => {
  return jwt.sign(
    { userId: userID },
    JWT_CONFIG.SECRET as jwt.Secret,
    { expiresIn: time } as SignOptions
  );
};

/* Validate token:
    Returns the decoded token if valid, otherwise returns an error message
    The decoded token is an object with the userId property (e.g. { userId: '123' })
 */
 const validateToken = (token: string): string | object => {
    try {
        return jwt.verify(token, JWT_CONFIG.SECRET as jwt.Secret);
    }
    catch (error) {
        throw new Error('Invalid or expired token');
    }
};

export default { createToken, validateToken };
