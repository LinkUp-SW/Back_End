import { Request, Response} from 'express';
import bcrypt from 'bcrypt';
import { getUserIdFromToken } from '../../utils/helper.ts';
import { findUserByUserId } from '../../utils/database.helper.ts';



const resetPassword = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const {password} = req.body;
        
        if (!password){
            return res.status(400).json({ message: 'New password is required' });
        }
        
        const userId = await getUserIdFromToken(req, res);
        if (!userId) return;
        let user;
        if (userId){
            user = await findUserByUserId(userId,res);
        }
        if (user){
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
        }


    } catch (error) {

        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message });
        }
        else{
            res.status(500).json({ message: 'Server error', error });

        }

    }
};

export {resetPassword};