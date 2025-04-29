import express from 'express';
import * as skillsControllers from '../../controllers/user_profile/skills.controller.ts';

const router = express.Router();

// Skills Section
// POST /api/v1/user/add-skill
router.post('/add-skill', (req, res, next) => {
    skillsControllers.addSkill(req, res, next);
});

// PUT /api/v1/user/update-skill/:skillId
router.put('/update-skill/:skillId', (req, res, next) => {
    skillsControllers.updateSkill(req, res, next);  
});

// DELETE /api/v1/user/delete-skill/:skillId
router.delete('/delete-skill/:skillId', (req, res, next) => {
    skillsControllers.deleteSkill(req, res, next);
});

// GET /api/v1/user/get-user-sections
router.get('/get-user-sections', (req, res, next) => {
    skillsControllers.getUserSections(req, res, next);
});

// POST /api/v1/user/endorse-skill/:userId/:skillId
router.post('/endorse-skill/:userId/:skillId', (req, res, next) => {
    skillsControllers.endorseSkill(req, res, next);
});

// delete /api/v1/user/remove-endorsement/:userId/:skillId
router.delete('/remove-endorsement/:userId/:skillId', (req, res, next) => {
    skillsControllers.removeEndorsement(req, res, next);
});

export default router;
