import express from 'express';
import { resetPassword } from '../../controllers/authentication/resetPassword.controller.ts';

const router = express.Router();




router.patch('/reset-password', (req,res) =>{
    resetPassword(req,res);
});


export default router;
