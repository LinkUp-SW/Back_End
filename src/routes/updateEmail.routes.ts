import express from 'express';
import {updateEmail}  from '../controllers/updateEmail.controller.ts';

const router = express.Router();

// POST /api/v1/user/update-email
router.put('/update-email', (req,res,next) => {
    updateEmail(req ,res,next);
});

export default router;