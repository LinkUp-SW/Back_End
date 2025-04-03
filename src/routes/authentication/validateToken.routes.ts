import express from 'express';
import { tokenValidation } from '../../controllers/authentication/validateToken.controller.ts';
const router = express.Router();




router.get('/validate-token', (req,res) =>{
    tokenValidation(req,res);
});


export default router;
