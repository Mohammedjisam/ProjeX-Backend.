import express from 'express';
import { 
  createPaymentIntent, 
  subscribe, 
  completeSubscription, // Add this new import
  handleWebhook, 
  cancelSubscription, 
  updateSubscription,
  getSubscriptionDetails,
  updatePaymentMethod
} from '../controllers/payment/payment.controller';


const paymentRouter = express.Router();
import { protect } from "../middleware/auth";


// Public route for Stripe webhooks (needs raw body)
paymentRouter.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes that require authentication
paymentRouter.post('/create-payment-intent', protect, createPaymentIntent);
paymentRouter.post('/subscribe', protect, subscribe);
paymentRouter.post('/complete-subscription', protect, completeSubscription); // Add this new route

// Company subscription management routes (require company admin access)
paymentRouter.get('/subscription', protect, getSubscriptionDetails);
paymentRouter.post('/subscription/:companyId/cancel', protect, cancelSubscription);
paymentRouter.post('/subscription/:companyId/update', protect, updateSubscription);
paymentRouter.post('/subscription/:companyId/payment-method', protect, updatePaymentMethod);

export default paymentRouter;