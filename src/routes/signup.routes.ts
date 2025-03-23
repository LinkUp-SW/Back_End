import express from 'express';
import * as signupFunctionality from '../controllers/signup.controllers.ts';

const router = express.Router();

// POST /api/v1/user/verify-email
router.post('/verify-email', signupFunctionality.verifyEmail);

// POST /api/v1/user/signup/starter
router.post('/signup/starter', signupFunctionality.addUserStarterInfo);

export default router;
