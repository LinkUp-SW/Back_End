import express from 'express';
import * as otpFunctionality from '../controllers/authentication/otp.controller.ts';;

const router = express.Router();

// POST /api/v1/user/send-otp
router.post('/send-otp', otpFunctionality.generateOTP);

// POST /api/v1/otp/verify
router.post('/verify-otp', otpFunctionality.verifyOTP);

export default router;