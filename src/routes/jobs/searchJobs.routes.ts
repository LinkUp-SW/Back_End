import express from 'express';
import * as searchJobsControllers from '../../controllers/jobs/searchJobs.controller.ts';

const router = express.Router();

// GET /api/v1/jobs/search-jobs
router.get('/search-jobs', (req, res, next) => {
    searchJobsControllers.searchJobs(req, res, next);
});

export default router;