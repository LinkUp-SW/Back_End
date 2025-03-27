import express from 'express';
import { updateUsername } from '../../controllers/authentication/updateUsername.Controller.ts';

const router = express.Router();



router.patch('/update-username', (req,res) =>{
    updateUsername(req,res);
});


export default router;
