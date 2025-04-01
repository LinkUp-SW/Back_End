import express from 'express';
import * as filterJobsControllers from '../../controllers/jobs/filterJobs.controller.ts';

const router = express.Router();

// Combined filter endpoint (takes parameters in body)
router.get('/filter-jobs', (req, res, next) => {
    filterJobsControllers.filterJobs(req, res, next);
});

// Filter Jobs By Location
router.get('/filter-jobs/location/:location', (req, res, next) => {
    filterJobsControllers.filterJobsByLocation(req, res, next);
});

// Filter Jobs By Experience Level (multiple levels as comma-separated values)
router.get('/filter-jobs/experience-level/:levels', (req, res, next) => {
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
