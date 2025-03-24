import express from 'express';
import { updateUserProfile } from '../../controllers/user_profile/update.user.profile.controller.ts';

const router = express.Router();

// PUT /api/v1/user/update-user-profile
router.put('/update-user-profile', (req, res, next) =>{
    updateUserProfile(req, res, next);
});


export default router;
