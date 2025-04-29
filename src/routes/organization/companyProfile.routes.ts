import express from 'express';
import * as companyProfileControllers from '../../controllers/organization/companyProfile.controller.ts';

const router = express.Router();

// Create company profile
router.post('/create-company-profile', (req, res, next) => {
    companyProfileControllers.createCompanyProfile(req, res, next);
});

// Update company profile
router.put('/update-company-profile/:companyId', (req, res, next) => {
    companyProfileControllers.updateCompanyProfile(req, res, next);
});

// Delete company profile
router.delete('/delete-company-profile/:companyId', (req, res, next) => {
    companyProfileControllers.deleteCompanyProfile(req, res, next);
});

// Get company profile by ID (All view)
router.get('/get-company-all-view/:companyId', (req, res, next) => {
    companyProfileControllers.getCompany(req, res, next);
});

// Get company profile by ID (Admin view)
router.get('/get-company-admin-view/:companyId', (req, res, next) => {
    companyProfileControllers.getCompanyAdminView(req, res, next);
});

router.get('/get-user-comapanies', (req, res, next) => {
    companyProfileControllers.getUserAdminOrganizations(req, res, next);
});

export default router;
