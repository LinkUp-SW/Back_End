import express from 'express';
import * as aboutControllers from '../../controllers/user_profile/about.controller.ts';

const router = express.Router();

// Route to add user about information
router.post('/profile/about', aboutControllers.addUserAbout);

// Route to update user about information
router.put('/profile/about', aboutControllers.updateUserAbout);

// Route to delete user about information
router.delete('/profile/about', aboutControllers.deleteUserAbout);

// Route to get user about information
router.get('/profile/about/:user_id', aboutControllers.getUserAbout);

export default router;

