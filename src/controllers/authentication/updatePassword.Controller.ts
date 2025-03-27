import { Request, Response} from 'express';
import bcrypt from 'bcrypt';
import { getUserIdFromToken } from '../../utils/helper.ts';
import { findUserByUserId } from '../../utils/database.helper.ts';



const updatePassword = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const {old_password,new_password} = req.body;
        
        if (!old_password || !new_password){
            return res.status(400).json({ message: 'passwords are required' });
        }

        if (new_password == old_password){
        return res.status(401).json({ message: 'Please enter a new password' });
        }

        if (new_password.length < 8){
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
        }
        
        const userId = await getUserIdFromToken(req, res);
        if (!userId) return;
        let user;
        if (userId){
            user = await findUserByUserId(userId,res);
        }
        if (user){
            const isSamePassword = await bcrypt.compare(old_password,user.password)
            if (!isSamePassword){
                return res.status(403).json({ message: 'Old password is incorrect' });
            }
    
    
            user.password=new_password;
            await user.save()
    
            res.status(200).json({ message: 'Password updated successfully' });

        }


    }catch (error) {


        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message });
        }
        else{
            res.status(500).json({ message: 'Server error', error });

        }

    }
};

export {updatePassword};