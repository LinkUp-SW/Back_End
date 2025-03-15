import { Router } from 'express';
import passport from 'passport';
import * as authController from '../controllers/googleAuthController.ts';

const router = Router();

router.get('/user/google-request', (req, res) => {
  res.send('<a href= "/auth/google">Authenticate with google</a>');
});

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  authController.handleGoogleCallback
);

router.get('/google-logout', authController.handleLogout);

export default router;