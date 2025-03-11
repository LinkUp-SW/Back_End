import express from 'express';
import * as signupFunctionality from '../controllers/signup.controllers.ts';

const router = express.Router();

// POST /api/v1/user/signup
router.post('/signup', (res,req,next) =>{
    signupFunctionality.signup(res,req,next);
});

export default router;
