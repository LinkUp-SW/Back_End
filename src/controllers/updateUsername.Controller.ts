import { Request, Response} from 'express';
import users from '../models/users.model.ts';
import tokenUtils from '../utils/token.utils.ts';



const updateUsername = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

    const {token,new_username} = req.body;
    
    if (!token || !new_username){
        return res.status(400).json({ message: 'Token and new username are required' });
    }
    const usedUserName = await users.findOne({user_id:new_username})
    if (usedUserName){
        return res.status(403).json({ message: 'Username already in use' });
    }
    const decodedUser = tokenUtils.validateToken(token) as { userId: string };
    

    const user = await users.findOne({user_id:decodedUser.userId});
    if (!user){
        return res.status(404).json({ message: 'User not found' });

    }

    user.user_id=new_username
    
    await user.save()

    

    res.status(200).json({ message: 'User name updated successfully' });

    }catch (error) {
        console.error('Update Username error:', error);
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message });
        }
        else{
            res.status(500).json({ message: 'Server error', error });

        }}
};

export {updateUsername};