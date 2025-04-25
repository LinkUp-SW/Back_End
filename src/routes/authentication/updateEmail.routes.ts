import express from 'express';
import {updateEmail,getCurrentEmail}  from '../../controllers/authentication/updateEmail.controller.ts';

const router = express.Router();

// PATCH /api/v1/user/update-email
router.patch('/update-email', (req,res,next) => {
    updateEmail(req ,res,next);
});

//GET /api/v1/user/get-current-email
router.get('/get-current-email', (req,res,next) => {
    getCurrentEmail(req ,res,next);
});

export default router;