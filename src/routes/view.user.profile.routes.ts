import express from 'express';
import { getUserProfile } from '../controllers/view.user.profile.controller.ts';

const router = express.Router();

// Route to get user profile
router.get('/profile/:user_id', getUserProfile);


export default router;
