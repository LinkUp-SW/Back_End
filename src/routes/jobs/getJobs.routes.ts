import express from 'express';
import * as getJobsControllers from '../../controllers/jobs/getJobs.controller.ts';

const router = express.Router();

router.get('/get-top-jobs', (req, res, next) => {
    getJobsControllers.getPersonalizedJobRecommendations(req, res, next);
});

router.get('/get-jobs', (req, res, next) => {
    getJobsControllers.getAllJobs(req, res, next);
});

router.get('/get-job/:jobId', (req, res, next) => {
    getJobsControllers.getJobById(req, res, next);
});

export default router;