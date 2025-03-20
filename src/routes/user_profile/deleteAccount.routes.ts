import express from 'express';
import { deleteAccount } from '../../controllers/user_profile/deleteAccount.controller.ts';

const router = express.Router();

// DELETE /api/v1/user/delete-account
router.delete('/delete-account', deleteAccount);

export default router;
