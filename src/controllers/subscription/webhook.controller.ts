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

