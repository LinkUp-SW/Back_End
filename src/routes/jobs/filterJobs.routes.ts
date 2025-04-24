import express from 'express';
import * as filterJobsControllers from '../../controllers/jobs/filterJobs.controller.ts';

const router = express.Router();

// Combined filter endpoint (takes parameters in body)
router.get('/filter-jobs', (req, res, next) => {
    filterJobsControllers.filterJobs(req, res, next);
});


export default router;
