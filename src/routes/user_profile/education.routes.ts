import express from 'express';
import * as educationControllers from '../../controllers/user_profile/education.controllers.ts';

const router = express.Router();

// Education Section
// POST /api/v1/user/add-education
router.post('/add-education', (req, res, next) =>{
    educationControllers.addEducation(req, res, next);
});

// PUT /api/v1/user/update-education/:educationId
router.put('/update-education/:educationId', (req, res, next) =>{
    educationControllers.updateEducation(req, res, next);
});

// DELETE /api/v1/user/delete-education/:educationId
router.delete('/delete-education/:educationId', (req, res, next) =>{
    educationControllers.deleteEducation(req, res, next);
});

export default router;
