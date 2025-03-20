import express from 'express';
import * as privacySettings from "../../controllers/user_profile/privacy.settings.controller.ts";

const router = express.Router();


router.get('/privacy-settings/profile-visibility/:user_id', privacySettings.getProfileVisibility);
router.put('/privacy-settings/profile-visibility/:user_id', privacySettings.updateProfileVisibility);

export default router;