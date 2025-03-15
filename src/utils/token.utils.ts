import jwt, { SignOptions } from 'jsonwebtoken';
import { JWT_CONFIG } from '../../config/jwt.config.ts';

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

const validateToken = (token: string): string | object => {
    try {
        return jwt.verify(token, JWT_CONFIG.SECRET as jwt.Secret);
    }
    catch (error) {
        return (error as Error).message;
    }
};

export default {createToken, validateToken};