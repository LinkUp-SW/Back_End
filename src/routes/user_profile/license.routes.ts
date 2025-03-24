import express from 'express';
import * as licenseControllers from '../../controllers/user_profile/license.controllers.ts';

const router = express.Router();

// License/Certificate Section
// POST /api/v1/user/add-license
router.post('/add-license', (req, res, next) =>{
    licenseControllers.addLicense(req, res, next);
});

// PUT /api/v1/user/update-license/:licenseId
router.put('/update-license/:licenseId', (req, res, next) =>{
    licenseControllers.updateLicense(req, res, next);
});

// DELETE /api/v1/user/delete-license/:licenseId
router.delete('/delete-license/:licenseId', (req, res, next) =>{
    licenseControllers.deleteLicense(req, res, next);
});

export default router;
