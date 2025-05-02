import express from 'express';
import * as companyJobsControllers from '../../controllers/organization/companyJobs.controller.ts';

const router = express.Router();

// Create job from company
router.post('/create-job-from-company/:organization_id', (req, res, next) => {
    companyJobsControllers.createJobFromCompany(req, res, next);
});

// Get all jobs from company
router.get('/get-jobs-from-company/:organization_id', (req, res, next) => {
    companyJobsControllers.getCompanyJobs(req, res, next);
});

// Change job status
router.put('/change-job-status/:job_id/:organization_id', (req, res, next) => {
    companyJobsControllers.changeJobStatus(req, res, next);
});

// Get company jobs analytics
router.get('/get-company-jobs-analytics/:organization_id', (req, res, next) => {
    companyJobsControllers.getCompanyJobsAnalytics(req, res, next);
});

export default router;
