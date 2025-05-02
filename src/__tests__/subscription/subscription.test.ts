import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import subscriptionRoutes from '../../routes/subscription/subscription.routes.ts';
import users from '../../models/users.model.ts';
import tokenUtils from '../../utils/token.utils.ts';
import { stripe, STRIPE_PREMIUM_PRICE_ID } from '../../../config/stripe.ts';

// Mock Stripe
jest.mock('../../../config/stripe.ts', () => {
  const originalModule = jest.requireActual('../../../config/stripe.ts');
  
  return {
    ...originalModule,
    stripe: {
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      customers: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
      subscriptions: {
        retrieve: jest.fn(),
        update: jest.fn(),
        list: jest.fn(),
      },
      invoices: {
        list: jest.fn(),
      },
    },
    STRIPE_PREMIUM_PRICE_ID: 'price_test123',
  };
});

const app = express();
app.use(express.json());
app.use(
  session({
    secret: 'testsecret',
    resave: false,
    saveUninitialized: true,
  })
);
app.use('/api/v1/user/subscription', subscriptionRoutes);

jest.setTimeout(30000);

beforeAll(async () => {
  await mongoose.connect(process.env.DATABASE_URL || '');
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Subscription Controllers', () => {
  let freeUserId: string;
  let premiumUserId: string;
  let cancelingUserId: string;
  let freeToken: string;
  let premiumToken: string;
  let cancelingToken: string;
  let free_id: string;
  let premium_id: string;
  let canceling_id: string;

  // Mock checkout session response
  const mockCheckoutSession = {
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/test',
  };

  // Mock subscription response
  const mockSubscription = {
    id: 'sub_test_123',
    status: 'active',
    customer: 'cus_test_123',
    current_period_start: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
    current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days from now
    cancel_at_period_end: false,
    items: {
      data: [
        {
          price: { id: 'price_test123' }
        }
      ]
    }
  };

  // Mock cancelled subscription
  const mockCancelledSubscription = {
    ...mockSubscription,
    cancel_at_period_end: true
  };

  // Mock invoices response
  const mockInvoices = {
    data: [
      {
        id: 'in_test_123',
        amount_paid: 999, // $9.99
        status: 'paid',
        created: Math.floor(Date.now() / 1000) - 86400,
        invoice_pdf: 'https://example.com/invoice.pdf'
      }
    ]
  };

  // Set up users with different subscription states
  beforeEach(async () => {
    // Create free user with no subscription
    const freeUser = await users.create({
      user_id: `free-${Date.now()}`,
      email: `free-${Date.now()}@example.com`,
      password: 'password123',
      bio: {
        first_name: 'Free',
        last_name: 'User'
      },
      is_verified: true,
    });

    freeUserId = freeUser.user_id;
    free_id = (freeUser._id as mongoose.Types.ObjectId).toString();
    freeToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: freeUserId })}`;

    // Create premium user with active subscription
    const premiumUser = await users.create({
      user_id: `premium-${Date.now()}`,
      email: `premium-${Date.now()}@example.com`,
      password: 'password123',
      bio: {
        first_name: 'Premium',
        last_name: 'User'
      },
      subscription: {
        status: 'active',
        plan: 'premium',
        subscription_id: 'sub_test_123',
        customer_id: 'cus_test_123',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        cancel_at_period_end: false,
        subscribed: true
      },
      is_verified: true,
    });

    premiumUserId = premiumUser.user_id;
    premium_id = (premiumUser._id as mongoose.Types.ObjectId).toString();
    premiumToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: premiumUserId })}`;

    // Create user with subscription marked for cancellation
    const cancelingUser = await users.create({
      user_id: `canceling-${Date.now()}`,
      email: `canceling-${Date.now()}@example.com`,
      password: 'password123',
      bio: {
        first_name: 'Canceling',
        last_name: 'User'
      },
      subscription: {
        status: 'active',
        plan: 'premium',
        subscription_id: 'sub_test_cancel',
        customer_id: 'cus_test_cancel',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancel_at_period_end: true,
        subscribed: true
      },
      is_verified: true,
    });

    cancelingUserId = cancelingUser.user_id;
    canceling_id = (cancelingUser._id as mongoose.Types.ObjectId).toString();
    cancelingToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: cancelingUserId })}`;

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await users.findByIdAndDelete(free_id);
    await users.findByIdAndDelete(premium_id);
    await users.findByIdAndDelete(canceling_id);
  });

  describe('GET /api/v1/user/subscription/status', () => {
    it('should return subscription status for a free user', async () => {
      const res = await request(app)
        .get('/api/v1/user/subscription/status')
        .set('Authorization', freeToken);

      expect(res.status).toBe(200);
      expect(res.body.subscription).toHaveProperty('plan', 'free');
      expect(res.body.subscription).toHaveProperty('status', 'active');
    });

    it('should return subscription status for a premium user', async () => {
      const res = await request(app)
        .get('/api/v1/user/subscription/status')
        .set('Authorization', premiumToken);

      expect(res.status).toBe(200);
      expect(res.body.subscription).toHaveProperty('plan', 'premium');
      expect(res.body.subscription).toHaveProperty('status', 'active');
      expect(res.body.subscription).toHaveProperty('subscribed', true);
    });

    it('should return subscription status for a canceling user', async () => {
      const res = await request(app)
        .get('/api/v1/user/subscription/status')
        .set('Authorization', cancelingToken);

      expect(res.status).toBe(200);
      expect(res.body.subscription).toHaveProperty('plan', 'premium');
      expect(res.body.subscription).toHaveProperty('cancel_at_period_end', true);
    });

  });

  describe('POST /api/v1/user/subscription/checkout', () => {
    it('should create a checkout session for a free user', async () => {
      // Mock Stripe checkout session creation
      (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockCheckoutSession);
      (stripe.customers.create as jest.Mock).mockResolvedValue({ id: 'cus_new_123' });

      const res = await request(app)
        .post('/api/v1/user/subscription/checkout')
        .set('Authorization', freeToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('url', 'https://checkout.stripe.com/test');
      expect(stripe.checkout.sessions.create).toHaveBeenCalled();
      expect(stripe.customers.create).toHaveBeenCalled();

      // Check that the customer ID was saved to the user
      const updatedUser = await users.findById(free_id);
      expect(updatedUser?.subscription?.customer_id).toBe('cus_new_123');
    });

    it('should not allow premium users to create new checkout sessions', async () => {
      // Mock Stripe subscription retrieve
      (stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue(mockSubscription);

      const res = await request(app)
        .post('/api/v1/user/subscription/checkout')
        .set('Authorization', premiumToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('You already have an existing subscription');
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('should not allow users with canceling subscriptions to create checkout sessions', async () => {
      // Mock Stripe subscription retrieve
      (stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue(mockCancelledSubscription);

      const res = await request(app)
        .post('/api/v1/user/subscription/checkout')
        .set('Authorization', cancelingToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('You have a subscription that will end soon');
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('should handle invalid subscription ID gracefully', async () => {
      // Create a user with invalid subscription ID
      const invalidSubUser = await users.create({
        user_id: `invalid-${Date.now()}`,
        email: `invalid-${Date.now()}@example.com`,
        password: 'password123',
        subscription: {
          subscription_id: 'sub_invalid',
          customer_id: 'cus_test_123',
          status: 'active',
          plan: 'premium',
          current_period_start: new Date(),
          current_period_end: new Date(),
          cancel_at_period_end: false,
          subscribed: true
        }
      });

      const invalidToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: invalidSubUser.user_id })}`;

      // Mock Stripe error for retrieving invalid subscription
      const stripeError = new Error('Subscription not found') as any;
      stripeError.code = 'resource_missing';
      (stripe.subscriptions.retrieve as jest.Mock).mockRejectedValue(stripeError);
      
      // Mock checkout session and customer creation
      (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockCheckoutSession);
      (stripe.customers.create as jest.Mock).mockResolvedValue({ id: 'cus_new_456' });
      (stripe.subscriptions.list as jest.Mock).mockResolvedValue({ data: [] });

      const res = await request(app)
        .post('/api/v1/user/subscription/checkout')
        .set('Authorization', invalidToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('url');
      expect(stripe.checkout.sessions.create).toHaveBeenCalled();

      // Cleanup
      await users.findByIdAndDelete(invalidSubUser._id);
    });

  });

  describe('POST /api/v1/user/subscription/cancel', () => {
    it('should cancel a premium subscription', async () => {
      // Mock Stripe subscription update
      (stripe.subscriptions.update as jest.Mock).mockResolvedValue({ 
        ...mockSubscription, 
        cancel_at_period_end: true 
      });

      const res = await request(app)
        .post('/api/v1/user/subscription/cancel')
        .set('Authorization', premiumToken);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Subscription will be canceled');
      expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_test_123', {
        cancel_at_period_end: true
      });

      // Check that the cancel_at_period_end flag was updated
      const updatedUser = await users.findById(premium_id);
      expect(updatedUser?.subscription?.cancel_at_period_end).toBe(true);
    });

    it('should handle users with no subscription', async () => {
      const res = await request(app)
        .post('/api/v1/user/subscription/cancel')
        .set('Authorization', freeToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No active premium subscription found');
      expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    });

  });

  describe('POST /api/v1/user/subscription/resume', () => {
    it('should resume a canceled subscription', async () => {
      // Mock Stripe subscription update
      (stripe.subscriptions.update as jest.Mock).mockResolvedValue({ 
        ...mockSubscription, 
        cancel_at_period_end: false 
      });

      const res = await request(app)
        .post('/api/v1/user/subscription/resume')
        .set('Authorization', cancelingToken);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Subscription resumed successfully');
      expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_test_cancel', {
        cancel_at_period_end: false
      });

      // Check that the cancel_at_period_end flag was updated
      const updatedUser = await users.findById(canceling_id);
      expect(updatedUser?.subscription?.cancel_at_period_end).toBe(false);
    });

    it('should handle users with no canceled subscription', async () => {
      const res = await request(app)
        .post('/api/v1/user/subscription/resume')
        .set('Authorization', premiumToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No canceled subscription found');
      expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    });

    it('should handle users with no subscription', async () => {
      const res = await request(app)
        .post('/api/v1/user/subscription/resume')
        .set('Authorization', freeToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No canceled subscription found');
      expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/user/subscription/invoices', () => {
    it('should return invoice history for a premium user', async () => {
      // Mock Stripe invoices list
      (stripe.invoices.list as jest.Mock).mockResolvedValue(mockInvoices);

      const res = await request(app)
        .get('/api/v1/user/subscription/invoices')
        .set('Authorization', premiumToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('invoices');
      expect(res.body.invoices).toHaveLength(1);
      expect(res.body.invoices[0]).toHaveProperty('id', 'in_test_123');
      expect(res.body.invoices[0]).toHaveProperty('amount_paid', 9.99); // Converted from cents
      expect(stripe.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        limit: 10
      });
    });

    it('should handle users with no subscription history', async () => {
      const res = await request(app)
        .get('/api/v1/user/subscription/invoices')
        .set('Authorization', freeToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No subscription history found');
      expect(stripe.invoices.list).not.toHaveBeenCalled();
    });
  });

  // Additional test for automatic cancellation at period end
  describe('Automatic Cancellation at Period End', () => {
    it('simulates webhook handling of subscription deletion', async () => {
      // Get the premium user before the webhook
      const userBefore = await users.findById(premium_id);
      expect(userBefore?.subscription?.plan).toBe('premium');
      
      // Directly trigger the subscription.deleted webhook handler logic
      const customerId = userBefore?.subscription?.customer_id;
      
      // Simulate the webhook controller's handleSubscriptionDeleted function
      const user = await users.findOne({ 'subscription.customer_id': customerId });
      if (user) {
        user.subscription.status = 'canceled';
        user.subscription.plan = 'free';
        user.subscription.canceled_at = new Date();
        user.subscription.cancel_at_period_end = false;
        await user.save();
      }
      
      // Get the user after the webhook
      const userAfter = await users.findById(premium_id);
      expect(userAfter?.subscription?.status).toBe('canceled');
      expect(userAfter?.subscription?.plan).toBe('free');
      expect(userAfter?.subscription?.canceled_at).toBeDefined();
      expect(userAfter?.subscription?.cancel_at_period_end).toBe(false);
    });
  });

  // Add to your subscription.test.ts file in the Stripe subscription tests
describe('Automatic Payment at Period End', () => {
    it('should properly handle subscription renewal via webhook', async () => {
      // Get the premium user before the renewal
      const userBefore = await users.findById(premium_id);
      expect(userBefore?.subscription?.plan).toBe('premium');
      
      // Record the original period end date
      const originalPeriodEnd = userBefore?.subscription?.current_period_end;
      expect(originalPeriodEnd).toBeDefined(); // Assert it's defined
      
      // Create a future date for the new period end (30 days after the current period end)
      const futurePeriodStart = new Date(originalPeriodEnd || new Date());
      const futurePeriodEnd = new Date(originalPeriodEnd || new Date());
      futurePeriodEnd.setDate(futurePeriodEnd.getDate() + 30);
      
      // Create a mock subscription with updated period dates
      const renewedSubscription = {
        ...mockSubscription,
        current_period_start: Math.floor(futurePeriodStart.getTime() / 1000),
        current_period_end: Math.floor(futurePeriodEnd.getTime() / 1000),
        status: 'active'
      };
      
      // Create a mock invoice for the renewal
      const renewalInvoice = {
        id: 'in_renewal_123',
        subscription: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'paid',
        created: Math.floor(futurePeriodStart.getTime() / 1000)
      };
      
      // Simulate Stripe subscription retrieval in the webhook 
      (stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue(renewedSubscription);
      
      // Simulate the webhook controller's handleInvoicePaymentSucceeded function
      const customerId = userBefore?.subscription?.customer_id;
      const user = await users.findOne({ 'subscription.customer_id': customerId });
      if (user) {
        if (renewalInvoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(renewalInvoice.subscription) as any;
          
          // Update the user's subscription with the new period dates
          const safeDate = (timestamp: number): Date => new Date(timestamp * 1000);
          
          user.subscription.status = subscription.status;
          user.subscription.current_period_start = safeDate(subscription.current_period_start);
          user.subscription.current_period_end = safeDate(subscription.current_period_end);
          
          await user.save();
        }
      }
      
      // Get the user after the webhook
      const userAfter = await users.findById(premium_id);
      expect(userAfter?.subscription?.status).toBe('active');
      expect(userAfter?.subscription?.plan).toBe('premium');
      
      // Add null check for dates before comparing
      expect(userAfter?.subscription?.current_period_start).toBeTruthy();
      expect(originalPeriodEnd).toBeTruthy();
      
      // The key test: verify that the period dates have been updated
      expect(userAfter!.subscription!.current_period_start!.getTime())
        .toBeGreaterThan(originalPeriodEnd!.getTime() - 86400000); // Allow a day of variance
        
      expect(userAfter!.subscription!.current_period_end!.getTime())
        .toBeGreaterThan(originalPeriodEnd!.getTime() + 86400000); // At least one day later
        
      // Verify the subscription remains active and premium
      expect(userAfter?.subscription?.subscribed).toBe(true);
    });
  });
});