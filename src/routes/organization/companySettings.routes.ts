import express from 'express';
import * as companySettingsControllers from '../../controllers/organization/companySettings.controller.ts';

const router = express.Router();

// Make Amin of an organization
router.post('/make-admin/:organization_id/:user_id', (req, res, next) => {
    companySettingsControllers.makeAdmin(req, res, next);
});

// Remove Admin of an organization
router.delete('/remove-admin/:organization_id/:user_id', (req, res, next) => {
    companySettingsControllers.removeAdmin(req, res, next);
});

// Get all Admins of an organization
router.get('/get-admins/:organization_id', (req, res, next) => {
    companySettingsControllers.getAdmins(req, res, next);
});

// Get all Admins of an organization for users
router.get('/get-admins-for-users/:organization_id', (req, res, next) => {
    companySettingsControllers.getAdminsForUsers(req, res, next);
});

// Block a follower of an organization
router.post('/block-follower/:organization_id/:follower_id', (req, res, next) => {
    companySettingsControllers.blockFollower(req, res, next);
});

// Unblock a follower of an organization
router.delete('/unblock-follower/:organization_id/:follower_id', (req, res, next) => {
    companySettingsControllers.unblockFollower(req, res, next);
});

// Get all blocked followers of an organization
router.get('/get-blocked-followers/:organization_id', (req, res, next) => {
    companySettingsControllers.getBlockedFollowers(req, res, next);
});

// Follow an organization
router.post('/follow-organization/:organization_id', (req, res, next) => {
    companySettingsControllers.followOrganization(req, res, next);
});

// Unfollow an organization
router.delete('/unfollow-organization/:organization_id', (req, res, next) => {
    companySettingsControllers.unfollowOrganization(req, res, next);
});

// Get all followers of an organization
router.get('/get-followers/:organization_id', (req, res, next) => {
    companySettingsControllers.getFollowers(req, res, next);
});

export default router;
