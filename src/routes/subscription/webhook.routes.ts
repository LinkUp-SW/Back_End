import express from 'express';
import { handleStripeWebhook } from '../../controllers/subscription/webhook.controller.ts';

const router = express.Router();

// POST /webhook/stripe - Handle Stripe events
router.post('/', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;