import express from 'express';
import * as signupFunctionality from '../../controllers/authentication/signup.controller.ts';
import { generateHashedPassword } from '../../utils/helperFunctions.utils.ts';

const router = express.Router();

// POST /api/v1/user/verify-email
router.post('/verify-email', signupFunctionality.verifyEmail);

// POST /api/v1/user/signup/starter
router.post('/signup/starter', signupFunctionality.addUserStarterInfo);

// GET /api/v1/user/hash-password
router.get('/hash-password', (req, res) => {
  const hashedPassword = generateHashedPassword();
  res.send({ hashedPassword });
});

export default router;
