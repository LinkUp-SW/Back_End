import { Router } from 'express';
import { createReport, getReports } from '../../controllers/admin/reports.controller.ts';


const router = Router();

// Route to create a new admin
router.post('/report', createReport);
router.get('/report',getReports);

export default router;