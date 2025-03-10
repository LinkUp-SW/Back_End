import express from 'express';
import * as otpFunctionality from '../controllers/otp.contorller.ts';;

const router = express.Router();

// POST /api/v1/otp/generate
router.post('/send-otp', (req, res, next) => {
    otpFunctionality.generateOTP(req, res, next);
});

// POST /api/v1/otp/verify
router.post('/verify-otp', (req, res, next) => {
     otpFunctionality.verifyOTP(req, res, next);
    });

export default router;