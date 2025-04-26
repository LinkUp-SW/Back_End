import express from 'express';
import * as subscriptionController from '../../controllers/subscription/subscription.controller.ts';

const router = express.Router();

// GET /api/v1/subscription/status
router.get('/status', (req, res, next) => {
  subscriptionController.getSubscriptionStatus(req, res, next);
});

// POST /api/v1/subscription/checkout
router.post('/checkout', (req, res, next) => {
  subscriptionController.createCheckoutSession(req, res, next);
});

// POST /api/v1/subscription/cancel
router.post('/cancel', (req, res, next) => {
  subscriptionController.cancelSubscription(req, res, next);
});

// POST /api/v1/subscription/resume
router.post('/resume', (req, res, next) => {
  subscriptionController.resumeSubscription(req, res, next);
});

// GET /api/v1/subscription/invoices
router.get('/invoices', (req, res, next) => {
  subscriptionController.getInvoiceHistory(req, res, next);
});

export default router;