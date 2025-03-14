import { Request, Response} from 'express';
import bcrypt from 'bcrypt';
import users from '../models/users.model.ts';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../../config/jwt.config.ts';


const updatePassword = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const {token,old_password,new_password} = req.body;
        
        if (!token || !old_password || !new_password){
            return res.status(400).json({ message: 'Token and password are required' });
        }

        if (new_password == old_password){
        return res.status(401).json({ message: 'Please enter a new password' });
        }

        if (new_password.length < 8){
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
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

        const isSamePassword = await bcrypt.compare(old_password,user.password)
        if (!isSamePassword){
            return res.status(403).json({ message: 'Old password is incorrect' });
        }


        user.password=new_password;
        await user.save()

        res.status(200).json({ message: 'Password updated successfully' });

    }catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export {updatePassword};