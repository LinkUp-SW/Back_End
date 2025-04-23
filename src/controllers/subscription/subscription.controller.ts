import { Request, Response, NextFunction } from 'express';
import { stripe, STRIPE_PREMIUM_PRICE_ID } from '../../../config/stripe.ts';
import users from '../../models/users.model.ts';
import { validateTokenAndGetUser } from '../../utils/helper.ts';

// Get current subscription status
export const getSubscriptionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await validateTokenAndGetUser(req, res);
    if (!user) return;

    return res.status(200).json({
      subscription: user.subscription || { plan: 'free', status: 'active' }
    });
  } catch (error) {
    next(error);
  }
};

// Create checkout session for premium subscription
export const createCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
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
              resume_url: `${process.env.FRONTEND_URL}/subscription/resume` 
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
              manage_url: `${process.env.FRONTEND_URL}/subscription/manage` 
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
            manage_url: `${process.env.FRONTEND_URL}/subscription/manage` 
          });
        }
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
        success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
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

