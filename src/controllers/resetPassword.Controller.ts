import { Request, Response} from 'express';
import users from '../models/users.model.ts';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../../config/jwt.config.ts';

const resetPassword = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const {password,token} = req.body;
        
        if (!password || !token){
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        let decodedUser;
        try {
        decodedUser = jwt.verify(token, JWT_CONFIG.SECRET as jwt.Secret) as { userId: string };
        } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
        }
        const user = await users.findById(decodedUser.userId);
        if (!user){
            return res.status(404).json({ message: 'User not found' });

        }
        const isSamePassword = await bcrypt.compare(password,user.password)
        if (isSamePassword){
            return res.status(400).json({ message: 'Please enter a new password' });
        }
        if (password.length < 8){
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }
        user.password=password;
        await user.save()

        
        res.status(200).json({ message: 'Password reset successful' });


    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export {resetPassword};