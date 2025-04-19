import express from 'express';
import * as manageFollowersControllers from '../../controllers/organization/companySettings.ts';

const router = express.Router();

// Block a follower of an organization
router.post('/block-follower/:organization_id/:follower_id', (req, res, next) => {
    manageFollowersControllers.blockFollower(req, res, next);
});

// Unblock a follower of an organization
router.delete('/unblock-follower/:organization_id/:follower_id', (req, res, next) => {
    manageFollowersControllers.unblockFollower(req, res, next);
});

// Get all blocked followers of an organization
router.get('/get-blocked-followers/:organization_id', (req, res, next) => {
    manageFollowersControllers.getBlockedFollowers(req, res, next);
});



export default router;
