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



