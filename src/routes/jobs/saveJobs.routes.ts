import express from 'express';
import * as saveJobsControllers from '../../controllers/jobs/saveJobs.controller.ts';

const router = express.Router();

router.post('/save-jobs/:jobId', (req, res, next) => {
    saveJobsControllers.saveJob(req, res, next);
});

router.get('/get-saved-jobs', (req, res, next) => {
    saveJobsControllers.getSavedJobs(req, res, next);
});

export default router;
