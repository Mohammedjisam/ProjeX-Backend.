import { Request, Response } from 'express';
import Stripe from 'stripe';
import { User } from '../../models/User';
import { Payment } from '../../models/Payment';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use the latest API version
});

// Map plan IDs to Stripe price IDs - replace with your actual Stripe price IDs
const PLAN_PRICE_MAP = {
  basic: 'price_1R3tnzHFwsFl0yfuyKZAxUat',
  pro: 'price_1R3tolHFwsFl0yfupXtIdzAT',
  business: 'price_1R3tpYHFwsFl0yfuECd4d9hL',
};

// Map plan IDs to prices (in cents)
const PLAN_AMOUNT_MAP = {
  basic: 1500,
  pro: 2000,
  business: 3000, 
};

// Create a payment intent
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { plan, amount } = req.body;
    
    if (!plan || !PLAN_AMOUNT_MAP[plan]) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount || PLAN_AMOUNT_MAP[plan],
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      // Add metadata about the plan
      metadata: {
        plan,
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent', details: error.message });
  }
};

export const subscribe = async (req: Request, res: Response) => {
  try {
    const { planId, userId } = req.body;

    // Validate the input
    if (!planId || !userId) {
      return res.status(400).json({ error: 'Missing required fields: planId and userId are required' });
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create or get the Stripe customer
    let customer;
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
      
      // Check if the customer was deleted on Stripe
      if ((customer as any).deleted) {
        // Create a new customer if the previous one was deleted
        customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            userId: user._id.toString(),
          },
        });
        // Update user with new Stripe customer ID
        await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
      }
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
        },
      });
      // Update user with Stripe customer ID
      await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
    }

    // Create a setup intent to collect payment details
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
    });

    // Check if the price exists in Stripe
    const priceId = PLAN_PRICE_MAP[planId];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Set plan limits based on the selected plan
    let maxBranches = 1;
    let maxUsers = 10;
    let maxMeetingParticipants = 3;
    
    switch (planId) {
      case 'pro':
        maxBranches = 3;
        maxUsers = 30;
        maxMeetingParticipants = 5;
        break;
      case 'business':
        maxBranches = 5;
        maxUsers = 50;
        maxMeetingParticipants = 10;
        break;
    }

    // Create payment data object with necessary information
    const paymentData = {
      companyAdmin: userId,
      planId,
      stripeCustomerId: customer.id,
      maxBranches,
      maxUsers,
      maxMeetingParticipants
    };

    // Return the setup intent and payment data
    res.status(200).json({
      success: true,
      setupIntent: setupIntent.client_secret,
      paymentData
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription', details: error.message });
  }
};

// Modified completeSubscription function to match client expectations
export const completeSubscription = async (req: Request, res: Response) => {
  try {
    const { paymentData, setupIntentId } = req.body;
    const userId = paymentData.companyAdmin; // Extract userId from paymentData

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Retrieve the setup intent to get the payment method ID
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    if (setupIntent.status !== 'succeeded' || !setupIntent.payment_method) {
      return res.status(400).json({ error: 'Invalid setup intent' });
    }

    const paymentMethodId = setupIntent.payment_method as string;

    // Set it as the default payment method for the customer
    await stripe.customers.update(paymentData.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: paymentData.stripeCustomerId,
      items: [
        {
          price: PLAN_PRICE_MAP[paymentData.planId],
        },
      ],
      default_payment_method: paymentMethodId,
    });

    // Create the payment with all required fields
    const payment = new Payment({
      companyAdmin: userId,
      planId: paymentData.planId,
      stripeCustomerId: paymentData.stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      paymentMethodId: paymentMethodId,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      maxBranches: paymentData.maxBranches,
      maxUsers: paymentData.maxUsers,
      maxMeetingParticipants: paymentData.maxMeetingParticipants
    });

    await payment.save();

    // Update user role to companyAdmin if not already
    if (user.role !== 'companyAdmin') {
      await User.findByIdAndUpdate(userId, { 
        role: 'companyAdmin',
        companyId: payment._id 
      });
    }

    res.status(200).json({
      success: true,
      subscription,
      payment,
    });
  } catch (error) {
    console.error('Error completing subscription:', error);
    res.status(500).json({ error: 'Failed to complete subscription', details: error.message });
  }
};
// Handle Stripe webhook events
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }
  
  let event;

  try {
    // Note: req.body should be the raw request body for Stripe webhook verification
    // This is why we need express.raw middleware for this route
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await updateSubscriptionStatus(subscription);
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      await updateSubscriptionFromInvoice(invoice);
      break;
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      await handleFailedPayment(failedInvoice);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};


// Helper function to update subscription status
async function updateSubscriptionStatus(subscription) {
  try {
    await Payment.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      }
    );
  } catch (error) {
    console.error('Error updating subscription status:', error);
  }
}

// Helper function to update subscription from invoice
async function updateSubscriptionFromInvoice(invoice) {
  try {
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      await updateSubscriptionStatus(subscription);
    }
  } catch (error) {
    console.error('Error updating subscription from invoice:', error);
  }
}

// Helper function to handle failed payment
async function handleFailedPayment(invoice) {
  try {
    if (invoice.subscription) {
      const payment = await Payment.findOne({ stripeSubscriptionId: invoice.subscription });
      if (payment) {
        payment.subscriptionStatus = 'past_due';
        await payment.save();

        // You can add notification logic here to inform the company admin
      }
    }
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

// Cancel subscription
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const userId = req.user.id;

    // Find the payment
    const payment = await Payment.findById(companyId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user is authorized (admin or company admin)
    if (payment.companyAdmin.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to cancel this subscription' });
    }

    // Cancel the subscription in Stripe
    await stripe.subscriptions.cancel(payment.stripeSubscriptionId);

    // Update the payment record
    payment.subscriptionStatus = 'canceled';
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Subscription canceled successfully',
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

// Update subscription plan
export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { newPlanId } = req.body;
    const userId = req.user.id;

    // Validate plan ID
    if (!PLAN_PRICE_MAP[newPlanId]) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Find the payment
    const payment = await Payment.findById(companyId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user is authorized (admin or company admin)
    if (payment.companyAdmin.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this subscription' });
    }

    // Check if the plan is actually changing
    if (payment.planId === newPlanId) {
      return res.status(400).json({ error: 'Company is already on this plan' });
    }

    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(payment.stripeSubscriptionId);

    // Update the subscription items
    await stripe.subscriptions.update(payment.stripeSubscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: PLAN_PRICE_MAP[newPlanId],
        },
      ],
      proration_behavior: 'create_prorations',
    });

    // Update the payment record
    payment.planId = newPlanId;
    await payment.save(); // This will trigger the pre-save hook to update plan limits

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      payment,
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

// Get subscription details
export const getSubscriptionDetails = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const userId = req.user.id;

    // Find the payment
    const payment = await Payment.findById(companyId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user is authorized (admin or company admin or company member)
    const isCompanyAdmin = payment.companyAdmin.toString() === userId;
    const isSystemAdmin = req.user.role === 'admin';
    
    if (!isCompanyAdmin && !isSystemAdmin) {
      // Check if user is a member of the company
      const isMember = await User.exists({ _id: userId, companyId });
      if (!isMember) {
        return res.status(403).json({ error: 'Not authorized to view this subscription' });
      }
    }

    // Get the subscription from Stripe for the most up-to-date information
    const subscription = await stripe.subscriptions.retrieve(payment.stripeSubscriptionId);

    // Get the payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(payment.paymentMethodId);

    res.status(200).json({
      success: true,
      subscription: {
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        plan: payment.planId,
        paymentMethod: {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
        },
        limits: {
          maxBranches: payment.maxBranches,
          maxUsers: payment.maxUsers,
          maxMeetingParticipants: payment.maxMeetingParticipants,
        },
      },
    });
  } catch (error) {
    console.error('Error getting subscription details:', error);
    res.status(500).json({ error: 'Failed to get subscription details' });
  }
};

// Update payment method
export const updatePaymentMethod = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { paymentMethodId } = req.body;
    const userId = req.user.id;

    // Find the payment
    const payment = await Payment.findById(companyId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user is authorized (admin or company admin)
    if (payment.companyAdmin.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update payment method' });
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ error: 'User not found or no Stripe customer' });
    }

    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    // Set it as the default payment method
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Update the payment record
    payment.paymentMethodId = paymentMethodId;
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment method updated successfully',
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
};