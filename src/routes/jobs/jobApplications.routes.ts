import express from 'express';
import * as jobApplicationControllers from '../../controllers/jobs/jobApplications.controllor.ts';

const router = express.Router();

router.get('/apply-for-job', (req, res, next) => {
    jobApplicationControllers.ApplyForJob(req, res, next);
});

router.post('/create-job-application/:job_id', (req, res, next) => {
    jobApplicationControllers.CreateJobApplication(req, res, next);
});

router.get('/get-job-applications/:job_id', (req, res, next) => {
    jobApplicationControllers.GetJobApplications(req, res, next);
});

router.get('/get-applied-jobs', (req, res, next) => {
    jobApplicationControllers.getAppliedJobs(req, res, next);
});

router.put('/update-job-application-status/:application_id', (req, res, next) => {
    jobApplicationControllers.changeJobApplicationStatus(req, res, next);
});

export default router;