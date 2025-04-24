import { Request, Response } from 'express';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../../../config/stripe.ts';
import users from '../../models/users.model.ts';

export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;
  
    if (!signature) {
      res.status(400).json({ message: 'Stripe signature missing' });
      return;
    }
  
    let event;
  
    try {
      // req.body will be a Buffer when using express.raw middleware
      event = stripe.webhooks.constructEvent(
        req.body, // This is now the raw buffer
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
    
    // Handle the event
    try {
      console.log(`Processing event: ${event.type}`);
      
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          await handleCheckoutSessionCompleted(session);
          break;
        }
        case 'customer.subscription.created': {
          const subscription = event.data.object;
          await handleSubscriptionCreated(subscription);
          break;
        }
        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          await handleSubscriptionUpdated(subscription);
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          await handleSubscriptionDeleted(subscription);
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          await handleInvoicePaymentSucceeded(invoice);
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          await handleInvoicePaymentFailed(invoice);
          break;
        }
        // Add handlers for previously unhandled events
        case 'charge.succeeded':
        case 'payment_method.attached':
        case 'payment_intent.succeeded':
        case 'payment_intent.created':
        case 'invoice.created':
        case 'invoice.finalized':
        case 'invoice.paid':
          // Just acknowledge these events without further processing
          console.log(`Acknowledged event ${event.type}`);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
};

async function handleCheckoutSessionCompleted(session: any) {
  const userId = session.metadata.userId;
  if (!userId) return;

  const user = await users.findOne({ user_id: userId });
  if (!user) return;

  if (!user.subscription) user.subscription = {} as any;
  user.subscription.customer_id = session.customer;
  await user.save();
}

async function handleSubscriptionCreated(subscription: any) {
  await updateUserSubscription(subscription);
}

async function handleSubscriptionUpdated(subscription: any) {
  await updateUserSubscription(subscription);
}

async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer;
  
  const user = await users.findOne({ 'subscription.customer_id': customerId });
  if (!user) return;

  user.subscription.status = 'canceled';
  user.subscription.plan = 'free';
  user.subscription.canceled_at = new Date();
  user.subscription.cancel_at_period_end = false;
  user.subscription.subscribed = false;
  
  await user.save();
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  const customerId = invoice.customer;
  
  const user = await users.findOne({ 'subscription.customer_id': customerId });
  if (!user) return;

  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    await updateUserSubscription(subscription);
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  const customerId = invoice.customer;
  
  const user = await users.findOne({ 'subscription.customer_id': customerId });
  if (!user) return;

  user.subscription.status = 'past_due';
  await user.save();
}

async function updateUserSubscription(subscription: any) {
  try {
    const customerId = subscription.customer;
    
    const user = await users.findOne({ 'subscription.customer_id': customerId });
    if (!user) return;

    let planName = 'free';
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      const items = subscription.items.data;
      if (items && items.length > 0) {
        const priceId = items[0].price.id;
        if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
          planName = 'premium';
        }
      }
    }

    // Fix date conversions by ensuring valid timestamps and using a safe date conversion
    const safeDate = (timestamp: number | null | undefined): Date | undefined => {
      if (!timestamp) return undefined;
      const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
      return isNaN(date.getTime()) ? undefined : date;
    };

    const startDate = safeDate(subscription.current_period_start);
    const endDate = safeDate(subscription.current_period_end);
    const canceledDate = safeDate(subscription.canceled_at);

    // Update subscription only with valid dates
    const subscriptionUpdate: any = {
      status: subscription.status,
      plan: planName,
      subscription_id: subscription.id,
      cancel_at_period_end: subscription.cancel_at_period_end,
      subscribed: planName === 'premium'
    };
    
    // Only add dates if they're valid
    if (startDate) subscriptionUpdate.current_period_start = startDate;
    if (endDate) subscriptionUpdate.current_period_end = endDate;
    if (canceledDate) subscriptionUpdate.canceled_at = canceledDate;
    
    // Preserve existing subscription_started_at if it exists
    if (user.subscription.subscription_started_at) {
      subscriptionUpdate.subscription_started_at = user.subscription.subscription_started_at;
    } else {
      subscriptionUpdate.subscription_started_at = new Date();
    }
    
    // Update the user's subscription with the validated data
    user.subscription = {
      ...user.subscription,
      ...subscriptionUpdate
    };

    await user.save();
    console.log(`Updated subscription for user ${user.user_id} to plan: ${planName}`);
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}