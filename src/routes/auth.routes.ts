import express from 'express';
import passport from 'passport';
import { login, googleCallback, googleLogout, logout } from '../controllers/auth.controller.ts';

const router = express.Router();

// Local authentication routes
router.post('/login', login);
router.get('/logout', logout);

// Google OAuth routes
// This route triggers Passport's Google strategy
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback route - Passport handles authentication and then calls our controller
router.get('/google/callback', passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_REDIRECT_URL}/login` }), googleCallback);

// Google logout route - revokes token, destroys session, clears cookie
router.get('/google/logout', googleLogout);

export default router;
