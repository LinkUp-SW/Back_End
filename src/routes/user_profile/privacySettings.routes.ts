import express from 'express';
import * as privacySettings from "../../controllers/user_profile/privacySettings.controller.ts";

const router = express.Router();


router.get('/privacy-settings/profile-visibility', privacySettings.getProfileVisibility);
router.put('/privacy-settings/profile-visibility', privacySettings.updateProfileVisibility);

router.get('/privacy-settings/invitations-requests', privacySettings.getInvitationSettings);
router.put('/privacy-settings/invitations-requests', privacySettings.updateInvitationSettings);

router.get('/privacy-settings/follow-requests', privacySettings.getFollowSettings);
router.put('/privacy-settings/follow-requests', privacySettings.updateFollowSettings);


export default router;