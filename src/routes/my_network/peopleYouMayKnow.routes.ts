import express from 'express';
import { getPeopleYouMayKnow } from '../../controllers/my_network/peopleYouMayKnow.controller.ts';

const router = express.Router();

// GET /api/v1/user/people-you-may-know
router.get('/people-you-may-know', getPeopleYouMayKnow);

export default router;