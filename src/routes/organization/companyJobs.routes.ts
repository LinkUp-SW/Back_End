import express from 'express';
import * as companyJobsControllers from '../../controllers/organization/companyJobs.controller.ts';

const router = express.Router();

// Create job from company
router.post('/create-job-from-company/:organization_id', (req, res, next) => {
    companyJobsControllers.createJobFromCompany(req, res, next);
});

// Update job from company
router.put('/update-job-from-company/:organization_id/:job_id', (req, res, next) => {
    companyJobsControllers.editJob(req, res, next);
});

// Get all jobs from company
router.get('/get-jobs-from-company/:organization_id', (req, res, next) => {
    companyJobsControllers.getCompanyJobs(req, res, next);
});

export default router;
