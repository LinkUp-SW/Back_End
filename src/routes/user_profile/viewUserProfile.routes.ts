import express from 'express';
import * as profile from '../../controllers/user_profile/viewUserProfile.controller.ts';

const router = express.Router();


// Route to get user bio
router.get('/profile/bio/:user_id', profile.getUserBio);

// Route to get user experience
router.get('/profile/experience/:user_id', profile.getUserExperience);

// Route to get user education
router.get('/profile/education/:user_id', profile.getUserEducation);

// Route to get user skills
router.get('/profile/skills/:user_id', profile.getUserSkills);

// Route to get user licenses
router.get('/profile/licenses/:user_id', profile.getUserLicense);


export default router;
