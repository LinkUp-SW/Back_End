import { Router } from 'express';
import { createReport, getReports,getContentReports,resolveReport } from '../../controllers/admin/reports.controller.ts';


const router = Router();

// Route to create a new admin
router.post('/report', createReport);
router.get('/report',getReports);
router.get('/report/content/:contentType/:contentRef', getContentReports);
router.patch('/report/resolve/:contentType/:contentRef',resolveReport);
router.delete('/report/resolve/:contentType/:contentRef',resolveReport);

export default router;