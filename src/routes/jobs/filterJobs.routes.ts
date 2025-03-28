import express from 'express';
import * as filterJobsControllers from '../../controllers/jobs/filterJobs.controller.ts';

const router = express.Router();

// Filter Jobs By Location
router.get('/filter-jobs/location/:location', (req, res, next) => {
    filterJobsControllers.filterJobsByLocation(req, res, next);
});

// Filter Jobs By Experience Level
router.get('/filter-jobs/experience-level/:level', (req, res, next) => {
    filterJobsControllers.filterJobsByExperienceLevel(req, res, next);
});

// Filter Jobs By Company
router.get('/filter-jobs/company/:companyId', (req, res, next) => {
    filterJobsControllers.filterJobsByCompany(req, res, next);
});

// Filter Jobs By Salary Range
router.get('/filter-jobs/salary-range/:minSalary/:maxSalary', (req, res, next) => {
    filterJobsControllers.filterJobsBySalaryRange(req, res, next);
});

export default router;
