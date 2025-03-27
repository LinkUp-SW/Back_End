import express from 'express';
import { getUserProfile } from '../../controllers/user_profile/viewUserProfile.controller.ts';

const router = express.Router();

// Route to get user profile
router.get('/profile/:user_id', getUserProfile);


export default router;
