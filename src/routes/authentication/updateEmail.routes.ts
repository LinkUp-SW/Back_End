import express from 'express';
import {updateEmail}  from '../../controllers/authentication/updateEmail.controller.ts';

const router = express.Router();

// PATCH /api/v1/user/update-email
router.patch('/update-email', (req,res,next) => {
    updateEmail(req ,res,next);
});

export default router;