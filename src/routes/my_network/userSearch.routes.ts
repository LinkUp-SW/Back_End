import express from 'express';
import { searchUsersController } from '../../controllers/my_network/userSearch.controller.ts';

const router = express.Router();

router.get('/users', searchUsersController);

export default router;