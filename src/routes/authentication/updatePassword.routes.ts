import express from 'express';
import { updatePassword } from '../../controllers/authentication/updatePassword.controller.ts';

const router = express.Router();



router.patch('/update-password', (req,res) =>{
    updatePassword(req,res);
});


export default router;
