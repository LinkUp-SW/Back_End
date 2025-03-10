// backend/src/routes/auth.routes.ts
import express from 'express';
import * as loginController from '../controllers/login.controller.ts';

const router = express.Router();

router.post('/login', (req, res, next) => {
    loginController.login(req, res, next);
});

router.get('/logout', loginController.logout);


export default router;