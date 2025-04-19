import express from 'express';
import * as privacySettings from "../../controllers/user_profile/privacySettings.controller.ts";

const router = express.Router();


router.get('/privacy-settings/profile-visibility', privacySettings.getProfileVisibility);
router.put('/privacy-settings/profile-visibility', privacySettings.updateProfileVisibility);




export default router;