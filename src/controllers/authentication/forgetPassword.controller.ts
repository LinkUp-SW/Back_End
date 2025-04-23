import { Request, Response } from 'express';
import users from '../../models/users.model.ts';
import { sendResetPasswordEmail } from '../../services/forgetPassword.service.ts';
import tokenUtils from '../../utils/token.utils.ts';


const forgetPassword = async (req: Request, res: Response): Promise<Response | void> =>{
    try {

        const {email} = req.body;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;  //validate the email format
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const user = await users.findOne({email:email});

        if (!user){
            return res.status(404).json({ message: 'Email not registered' });
        }
        const token=tokenUtils.createToken({time: '15m',
            userID: user.user_id
        })
        const resetLink = `${process.env.FRONTEND_REDIRECT_URL}/reset-password/${token}`;
        await sendResetPasswordEmail(email,resetLink);
        return res.status(200).json({ message: 'Password reset link sent to your email', reset_link:resetLink });

    } catch (error) {
        console.error('Forget password error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export {forgetPassword};