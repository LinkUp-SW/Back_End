import { Router } from 'express';
import { createAdmin } from '../../controllers/admin/createAdmin.controller.ts';


const router = Router();

// Route to create a new admin
router.post('/create-admin', createAdmin);

export default router;