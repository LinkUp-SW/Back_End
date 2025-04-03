import express from 'express';
import * as userControllers from '../../controllers/user_profile/experience.controller.ts';

const router = express.Router();

// Work Experience Section
// POST /api/v1/user/add-work-experience 
router.post('/add-work-experience', (req, res, next) =>{
    userControllers.addWorkExperience(req, res, next);
});

// PUT /api/v1/user/update-work-experience/:experienceId
router.put('/update-work-experience/:experienceId', (req, res, next) =>{
    userControllers.updateWorkExperience(req, res, next);
});

// DELETE /api/v1/user/delete-work-experience/:experienceId
router.delete('/delete-work-experience/:experienceId', (req, res, next) =>{
    userControllers.deleteWorkExperience(req, res, next);
});

export default router;