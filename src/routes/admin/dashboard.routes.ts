import { Router } from 'express';
import { getDashboardMetrics } from '../../controllers/admin/dashboard.controller.ts';


const router = Router();

// Route to create a new admin
router.get('/dashboard', getDashboardMetrics);

export default router;