import express from 'express';
import { deleteAccount, testDeleteAccount } from '../controllers/deleteAccount.controller.ts';

const router = express.Router();

// DELETE /api/v1/user/delete-account
router.delete('/delete-account', deleteAccount);
router.delete('/test-delete-account', testDeleteAccount);


export default router;
