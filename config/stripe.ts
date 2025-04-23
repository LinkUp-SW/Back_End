import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID || '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

export { 
  stripe, 
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PREMIUM_PRICE_ID
};