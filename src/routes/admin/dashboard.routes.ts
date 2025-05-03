import { Router } from 'express';
import { getDashboardMetrics, getPlatformAnalyticsData } from '../../controllers/admin/dashboard.controller.ts';


const router = Router();

// Routes for admin dashboard
router.get('/dashboard', (req,res) =>{
    getDashboardMetrics(req ,res);
});
router.get('/analytics', (req,res) =>{
    getPlatformAnalyticsData(req ,res);
});
export default router;