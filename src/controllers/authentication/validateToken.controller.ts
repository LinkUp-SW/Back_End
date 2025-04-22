import { Request, Response } from 'express';
import { getUserIdFromToken } from '../../utils/helper.ts';
import { findUserByUserId } from '../../utils/database.helper.ts';


const tokenValidation = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const userId = await getUserIdFromToken(req, res);
        if (!userId) return;
        const user = await findUserByUserId(userId,res);
        if (!user) return;
        if (!user.is_verified){
            return res.status(401).json({ message:"User not verified",success:false });
        }
        if (user){
           return res.status(200).json({ message: 'Validate token successful',success:true });
        }
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ message: error.message,success:false });
        }
        else{
            return res.status(500).json({ message: 'Server error', error });
    
        }
    }
};

export {tokenValidation};