import { Request, Response, NextFunction } from 'express';
import { stripe, STRIPE_PREMIUM_PRICE_ID } from '../../../config/stripe.ts';
import users from '../../models/users.model.ts';
import { validateTokenAndGetUser } from '../../utils/helper.ts';

// Get current subscription status
export const getSubscriptionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await validateTokenAndGetUser(req, res);
    if (!user) return;

    // Create a default subscription object without period dates for free users
    const defaultSubscription = {
      status: 'active',
      plan: 'free',
      subscription_id: null,
      customer_id: null,
      cancel_at_period_end: false,
      subscribed: false,
      canceled_at: null,
      subscription_started_at: null,
      subscription_ends_at: null,
      // Removed: current_period_start and current_period_end
    };

    // If user has a subscription, convert it to a plain object first
    let subscription;
    if (user.subscription) {
      // Convert Mongoose document to plain object 
      const subscriptionObj = typeof (user.subscription as any).toObject === 'function' 
        ? (user.subscription as any).toObject() 
        : user.subscription;
      
      // Create subscription object with only non-null period dates
      subscription = { 
        ...defaultSubscription,
        ...subscriptionObj,
      };

      if (subscription.subscription_started_at) {
        const startDate = new Date(subscription.subscription_started_at);
        if (startDate instanceof Date && !isNaN(startDate.getTime())) {
          const trialEndDate = new Date(startDate);
          trialEndDate.setDate(startDate.getDate() + 30); 
          subscription.subscription_ends_at = trialEndDate;
        }
      }
      
      // Remove null date fields completely rather than keeping them as null
      if (subscription.current_period_start === null) {
        delete subscription.current_period_start;
      }
      
      if (subscription.current_period_end === null) {
        delete subscription.current_period_end;
      }
    } else {
      subscription = defaultSubscription;
      // No need to delete fields as they're not included in defaultSubscription
    }
    
    return res.status(200).json({ subscription });
  } catch (error) {
    console.error('Error in getSubscriptionStatus:', error);
    next(error);
  }
};
// Create checkout session for premium subscription
export const createCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const platform = req.body.platform || 'web';
      let successUrl, cancelUrl;

      const manageUrl = platform === 'web' 
      ? `${process.env.FRONTEND_URL}/payment?status={cancel}`
      : `${process.env.APP_URL}/payment?status={cancel}`;

      const user = await validateTokenAndGetUser(req, res);
      if (!user) return;
  
      // ENHANCED CHECKS FOR EXISTING SUBSCRIPTIONS
      // Check if user already has any kind of subscription in our database
      if (user.subscription?.subscription_id) {
        // If they have an existing subscription ID, verify with Stripe directly
        try {
          const existingSubscription = await stripe.subscriptions.retrieve(
            user.subscription.subscription_id
          );

          // If canceled but not yet expired (cancel_at_period_end = true)
          if (existingSubscription.cancel_at_period_end) {
            return res.status(400).json({ 
              message: 'You have a subscription that will end soon. You can resume it instead.',
              subscription_status: 'ending_soon',
              // Let them know they can resume instead
              //resume_url: `${process.env.FRONTEND_URL}/subscription/resume` 
            });
          }
          
          // Check all states that indicate an active subscription
          // active = subscription is active
          // trialing = in free trial period
          // past_due = payment failed but subscription still exists
          // unpaid = subscription still exists but no longer attempting payment
          if (['active', 'trialing', 'past_due', 'unpaid'].includes(existingSubscription.status)) {
            return res.status(400).json({ 
              message: 'You already have an existing subscription',
              subscription_status: existingSubscription.status,
              // Return manage URL so frontend can redirect to manage instead of checkout
              manage_url: manageUrl 
            });
          }
          
        } catch (stripeError: any) {
          // If Stripe can't find the subscription, it may be deleted or invalid
          // Only proceed if the error is "resource not found"
          if (stripeError.code !== 'resource_missing') {
            throw stripeError;
          }
          
          // If the subscription ID is invalid, clear it and let them create a new one
          console.log('Invalid subscription ID in database, allowing new subscription');
          user.subscription.subscription_id = '';
          await user.save();
        }
      }
  
      // Create or retrieve Stripe customer
      let customerId = user.subscription?.customer_id;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.bio?.first_name || ''} ${user.bio?.last_name || ''}`.trim(),
          metadata: {
            userId: user.user_id
          }
        });
        customerId = customer.id;
        
        // Update user with customer ID
        if (!user.subscription) {
          user.subscription = {
            status: 'active',
            plan: 'free',
            subscription_id: '',
            customer_id: customerId,
            current_period_start: new Date(),
            current_period_end: new Date(),
            cancel_at_period_end: false,
            subscribed: false
          };
        } else {
          user.subscription.customer_id = customerId;
        }
        await user.save();
      } else {
        // If they have a customer ID, check for any active subscriptions
        const existingSubscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'all'
        });
        
        // Check if they have any active subscriptions on Stripe's side
        const activeSubscription = existingSubscriptions.data.find(sub => 
          ['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status)
        );
        
        if (activeSubscription) {
          // Update our database with this subscription
          await updateUserSubscriptionFromStripe(user, activeSubscription);
          
          return res.status(400).json({ 
            message: 'You already have an active subscription in our payment system',
            subscription_status: activeSubscription.status,
            manage_url: manageUrl
          });
        }
      }
      
      if (platform === 'web') {
        successUrl = `${process.env.FRONTEND_URL}/payment?status=success`
        cancelUrl = `${process.env.FRONTEND_URL}/payment?status=cancel`;
      } else if (platform === 'ios' || platform === 'android') {
        successUrl = `${process.env.APP_URL}/payment?status=success`;
        cancelUrl = `${process.env.APP_URL}/payment?status=cancel`;
      }
  
      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: STRIPE_PREMIUM_PRICE_ID,
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          userId: user.user_id
        }
      });
  
      res.status(200).json({ url: session.url });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      next(error);
    }
  };
  
  // Helper function to update user subscription from Stripe data
  async function updateUserSubscriptionFromStripe(user: any, subscription: any) {
    const safeDate = (timestamp: number | null | undefined): Date | undefined => {
      if (!timestamp) return undefined;
      const date = new Date(timestamp * 1000);
      return isNaN(date.getTime()) ? undefined : date;
    };
    
    let planName = 'free';
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      const items = subscription.items.data;
      if (items && items.length > 0) {
        const priceId = items[0].price.id;
        if (priceId === STRIPE_PREMIUM_PRICE_ID) {
          planName = 'premium';
        }
      }
    }
    
    const startDate = safeDate(subscription.current_period_start);
    const endDate = safeDate(subscription.current_period_end);
    
    user.subscription = {
      ...user.subscription,
      status: subscription.status,
      plan: planName,
      subscription_id: subscription.id,
      cancel_at_period_end: subscription.cancel_at_period_end,
      subscribed: planName === 'premium',
      ...(startDate && { current_period_start: startDate }),
      ...(endDate && { current_period_end: endDate }),
    };
    
    await user.save();
  }

// Cancel subscription
export const cancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await validateTokenAndGetUser(req, res);
    if (!user) return;

    // Check if user has an active subscription
    if (!user.subscription?.subscription_id || user.subscription?.plan !== 'premium') {
      return res.status(400).json({ message: 'No active premium subscription found' });
    }

    // Cancel subscription at period end in Stripe
    await stripe.subscriptions.update(user.subscription.subscription_id, {
      cancel_at_period_end: true
    });

    // Update user record
    user.subscription.cancel_at_period_end = true;
    user.subscription.status = 'canceled';
    user.subscription.subscribed = false;
    await user.save();

    res.status(200).json({ message: 'Subscription will be canceled at the end of the billing period' });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    next(error);
  }
};

// Resume canceled subscription
export const resumeSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await validateTokenAndGetUser(req, res);
    if (!user) return;

    // Check if user has a canceled subscription that's not yet expired
    if (!user.subscription?.subscription_id || !user.subscription?.cancel_at_period_end) {
      return res.status(400).json({ message: 'No canceled subscription found' });
    }

    // Resume subscription in Stripe
    await stripe.subscriptions.update(user.subscription.subscription_id, {
      cancel_at_period_end: false
    });

    // Update user record
    user.subscription.cancel_at_period_end = false;
    await user.save();

    res.status(200).json({ message: 'Subscription resumed successfully' });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    next(error);
  }
};

// Get user's invoice history
export const getInvoiceHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await validateTokenAndGetUser(req, res);
    if (!user) return;

    if (!user.subscription?.customer_id) {
      return res.status(400).json({ message: 'No subscription history found' });
    }

    const invoices = await stripe.invoices.list({
      customer: user.subscription.customer_id,
      limit: 10
    });

    res.status(200).json({
      invoices: invoices.data.map(invoice => ({
        id: invoice.id,
        amount_paid: invoice.amount_paid / 100, // Convert from cents
        status: invoice.status,
        created: new Date(invoice.created * 1000),
        invoice_pdf: invoice.invoice_pdf
      }))
    });
  } catch (error) {
    console.error('Error getting invoice history:', error);
    next(error);
  }
};