import express from 'express';
import { forgetPassword } from '../../controllers/authentication/forgetPassword.controller.ts';

const router = express.Router();


router.post('/forget-password', (req,res) =>{
    forgetPassword(req ,res);
});


export default router;
