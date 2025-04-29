import express from 'express';
import * as privacySettings from "../../controllers/user_profile/privacySettings.controller.ts";

const router = express.Router();


router.get('/privacy-settings/profile-visibility', privacySettings.getProfileVisibility);
router.put('/privacy-settings/profile-visibility', privacySettings.updateProfileVisibility);

router.get('/privacy-settings/invitations-requests', privacySettings.getInvitationSettings);
router.put('/privacy-settings/invitations-requests', privacySettings.updateInvitationSettings);

router.get('/privacy-settings/follow-requests', privacySettings.getFollowSettings);
router.put('/privacy-settings/follow-requests', privacySettings.updateFollowSettings);

router.get('/privacy-settings/follow-primary', privacySettings.getFollowPrimarySetting);
router.put('/privacy-settings/follow-primary', privacySettings.updateFollowPrimarySetting);

router.get('/privacy-settings/messaging-requests', privacySettings.getMessagingRequestsSetting);
router.put('/privacy-settings/messaging-requests', privacySettings.updateMessagingRequestsSetting);

router.get('/privacy-settings/read-receipts', privacySettings.getReadReceiptsSetting);
router.put('/privacy-settings/read-receipts', privacySettings.updateReadReceiptsSetting);

// // Route to get all privacy settings
router.get('/privacy-settings', privacySettings.getAllPrivacySettings);
export default router;