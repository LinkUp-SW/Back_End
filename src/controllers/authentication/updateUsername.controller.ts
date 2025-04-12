import { Request, Response} from 'express';
import users from '../../models/users.model.ts';
import { getUserIdFromToken } from '../../utils/helper.ts';
import { findUserByUserId } from '../../utils/database.helper.ts';



const updateUsername = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

    const {new_username} = req.body;
    
    if (!new_username){
        return res.status(400).json({ message: 'new username is required' });
    }
    const usedUserName = await users.findOne({user_id:new_username})
    if (usedUserName){
        return res.status(403).json({ message: 'Username already in use' });
    }
    const userId = await getUserIdFromToken(req, res);
    if (!userId) return;
    let user;
    if (userId){
        user = await findUserByUserId(userId,res);
    }
    if (user){
        
        user.user_id=new_username
        
        await user.save()
    
        
    
        res.status(200).json({ message: 'User name updated successfully' });

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

export {updateUsername};