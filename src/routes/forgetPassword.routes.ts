import express from 'express';
import { forgetPassword } from '../controllers/forgetPassword.Controller.ts';

const router = express.Router();


router.post('/forget-password', (req,res) =>{
    forgetPassword(req ,res);
});


export default router;
