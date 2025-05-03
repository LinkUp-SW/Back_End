import { Router } from 'express';
import { deleteUser, getPaginatedUsers } from '../../controllers/admin/users.controller.ts';


const router = Router();

// Routes for admin dashboard
router.get('/users', (req,res) =>{
    getPaginatedUsers(req ,res);
});
router.delete('/delete/:userId', (req,res) =>{
    deleteUser(req ,res);
});
export default router;