import { Request, Response } from 'express';
import Stripe from 'stripe';
import Company from '../../models/Company';
import { User } from '../../models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const PLAN_PRICE_MAP = {
  basic: process.env.PLAN_PRICE_BASIC || "price_1R3tnzHFwsFl0yfuyKZAxUat",
  pro: process.env.PLAN_PRICE_PRO || "price_1R3tolHFwsFl0yfupXtIdzAT",
  business: process.env.PLAN_PRICE_BUSINESS || "price_1R3tpYHFwsFl0yfuECd4d9hL"
};

const PLAN_AMOUNT_MAP = {
  basic: 1500,
  pro: 2000,
  business: 3000
};

export default class CompanyController {
  public async createPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const {
        companyName,
        companyType,
        companyDomain,
        phoneNumber,
        buildingNo,
        street,
        city,
        state,
        country,
        postalCode,
        planId,
        userId
      } = req.body;

      // Validate required fields
      const requiredFields = {
        companyName,
        companyType,
        companyDomain,
        phoneNumber,
        buildingNo,
        street,
        city,
        state,
        country,
        postalCode,
        planId,
        userId
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
        return;
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

         // Create or retrieve Stripe customer
         let customer;
         if (user.stripeCustomerId) {
             customer = await stripe.customers.retrieve(user.stripeCustomerId);
             if ((customer as any).deleted) {
                 customer = await stripe.customers.create({
                     email: user.email,
                     name: user.name,
                     metadata: { userId: user._id.toString() },
                 });
                 await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
             }
         } else {
             customer = await stripe.customers.create({
                 email: user.email,
                 name: user.name,
                 metadata: { userId: user._id.toString() },
             });
             await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
         }
 
         // Create payment intent
         const paymentIntent = await stripe.paymentIntents.create({
          amount: PLAN_AMOUNT_MAP[planId],
          currency: 'usd',
          customer: customer.id,
          setup_future_usage: 'off_session', // Add this line
          metadata: {
            planId,
            userId: user._id.toString()
          },
          payment_method_types: ['card']
        });
 
         // Prepare company data WITH stripeCustomerId
         const companyData = {
             companyName,
             companyType,
             companyDomain,
             phoneNumber,
             address: { buildingNo, street, city, state, country, postalCode },
             companyAdmin: userId,
             adminVerification: false,
             planId,
             stripeCustomerId: customer.id, // THIS IS CRUCIAL
             maxBranches: planId === 'basic' ? 1 : planId === 'pro' ? 3 : 5,
             maxUsers: planId === 'basic' ? 10 : planId === 'pro' ? 30 : 50,
             maxMeetingParticipants: planId === 'basic' ? 3 : planId === 'pro' ? 5 : 10
         };
 
         res.status(200).json({
             success: true,
             clientSecret: paymentIntent.client_secret,
             companyData // Make sure this includes stripeCustomerId
         });
     } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment intent',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  public async completeCompanyCreation(req: Request, res: Response): Promise<void> {
    try {
      const { companyData, paymentIntentId } = req.body;
  
      // 1. Verify payment was successful
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment not completed');
      }
  
      // 2. Get payment method ID
      const paymentMethodId = paymentIntent.payment_method as string;
      if (!paymentMethodId) {
        throw new Error('Payment method not found in payment intent');
      }
  
      // 3. Check if payment method is already attached
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: companyData.stripeCustomerId,
        });
      } catch (error) {
        if (error.code !== 'payment_method_already_attached') {
          throw error;
        }
        // Payment method is already attached, continue
      }
  
      // 4. Set as default payment method
      await stripe.customers.update(companyData.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
  
      // 5. Create subscription with idempotency key
      const subscription = await stripe.subscriptions.create({
        customer: companyData.stripeCustomerId,
        items: [{ price: PLAN_PRICE_MAP[companyData.planId] }],
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      }, {
        idempotencyKey: `sub_${companyData.stripeCustomerId}_${Date.now()}`
      });
  
      // 4. Create and save company record
      const company = new Company({
        ...companyData,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        paymentMethodId: paymentIntent.payment_method as string,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      });
  
      await company.save();
  
      // 5. Update user role
      const user = await User.findById(companyData.companyAdmin);
      if (user && user.role !== 'companyAdmin') {
        await User.findByIdAndUpdate(user._id, { 
          role: 'companyAdmin',
          companyId: company._id 
        });
      }
  
      res.status(201).json({
        success: true,
        data: company
      });
      
    } catch (error) {
      console.error('Error completing company creation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to complete company creation',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
  // Get all companies
  public async getAllCompanies(req: Request, res: Response): Promise<void> {
    try {
      const companies = await Company.find()
        .populate('companyAdmin', 'name email');
      
      res.status(200).json({
        success: true,
        count: companies.length,
        data: companies
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve companies'
      });
    }
  }

  // Get company by ID
  public async getCompanyById(req: Request, res: Response): Promise<void> {
    try {
      const company = await Company.findById(req.params.id)
        .populate('companyAdmin', 'name email');
      
      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }
      
      res.status(200).json({ success: true, data: company });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve company'
      });
    }
  }

  // Update company details
  public async updateCompany(req: Request, res: Response): Promise<void> {
    try {
      const {
        companyName,
        companyType,
        companyDomain,
        phoneNumber,
        address,
        adminVerification
      } = req.body;

      const updateData: any = {};
      
      if (companyName) updateData.companyName = companyName;
      if (companyType) updateData.companyType = companyType;
      if (companyDomain) updateData.companyDomain = companyDomain;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      
      if (address) {
        updateData.address = address;
      } else {
        // Handle individual address fields if needed
        const addressFields = ['buildingNo', 'street', 'city', 'state', 'country', 'postalCode'];
        addressFields.forEach(field => {
          if (req.body[field]) {
            updateData.address = updateData.address || {};
            updateData.address[field] = req.body[field];
          }
        });
      }
      
      if (typeof adminVerification === 'boolean') {
        updateData.adminVerification = adminVerification;
      }

      const company = await Company.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate('companyAdmin', 'name email');
      
      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }
      
      res.status(200).json({ success: true, data: company });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update company'
      });
    }
  }

  // Delete company
  public async deleteCompany(req: Request, res: Response): Promise<void> {
    try {
      const company = await Company.findByIdAndDelete(req.params.id);
      
      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }
      
      // Cancel Stripe subscription if exists
      if (company.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(company.stripeSubscriptionId);
      }
      
      res.status(200).json({ success: true, message: 'Company deleted successfully' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete company'
      });
    }
  }

  // Toggle admin verification
  public async toggleAdminVerification(req: Request, res: Response): Promise<void> {
    try {
      const company = await Company.findById(req.params.id);
      
      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }
      
      company.adminVerification = !company.adminVerification;
      await company.save();
      
      res.status(200).json({
        success: true,
        data: company,
        message: `Admin verification ${company.adminVerification ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to toggle admin verification'
      });
    }
  }

  // Get subscription details
  public async getSubscriptionDetails(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const company = await Company.findOne({ companyAdmin: userId });
      
      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }

      // Verify authorization
      const isCompanyAdmin = company.companyAdmin.toString() === userId;
      const isSystemAdmin = req.user.role === 'admin';
      
      if (!isCompanyAdmin && !isSystemAdmin) {
        // Check if user is a member of the company
        const isMember = await User.exists({ _id: userId, companyId: company._id });
        if (!isMember) {
          res.status(403).json({ success: false, message: 'Not authorized' });
          return;
        }
      }

      // Fetch subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(company.stripeSubscriptionId);
      const paymentMethod = await stripe.paymentMethods.retrieve(company.paymentMethodId);

      res.status(200).json({
        success: true,
        data: {
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          plan: company.planId,
          paymentMethod: {
            brand: paymentMethod.card?.brand,
            last4: paymentMethod.card?.last4,
            expMonth: paymentMethod.card?.exp_month,
            expYear: paymentMethod.card?.exp_year,
          },
          limits: {
            maxBranches: company.maxBranches,
            maxUsers: company.maxUsers,
            maxMeetingParticipants: company.maxMeetingParticipants,
          },
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get subscription details'
      });
    }
  }

  // Update subscription plan
  public async updateSubscriptionPlan(req: Request, res: Response): Promise<void> {
    try {
      const { newPlanId } = req.body;
      const userId = req.user.id;

      if (!PLAN_PRICE_MAP[newPlanId]) {
        res.status(400).json({ success: false, message: 'Invalid plan selected' });
        return;
      }

      const company = await Company.findOne({ companyAdmin: userId });
      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }

      if (company.planId === newPlanId) {
        res.status(400).json({ success: false, message: 'Already on this plan' });
        return;
      }

      const subscription = await stripe.subscriptions.retrieve(company.stripeSubscriptionId);
      await stripe.subscriptions.update(company.stripeSubscriptionId, {
        items: [{ id: subscription.items.data[0].id, price: PLAN_PRICE_MAP[newPlanId] }],
        proration_behavior: 'create_prorations',
      });

      // Update company with new plan and limits
      company.planId = newPlanId;
      switch (newPlanId) {
        case 'pro':
          company.maxBranches = 3;
          company.maxUsers = 30;
          company.maxMeetingParticipants = 5;
          break;
        case 'business':
          company.maxBranches = 5;
          company.maxUsers = 50;
          company.maxMeetingParticipants = 10;
          break;
        default:
          company.maxBranches = 1;
          company.maxUsers = 10;
          company.maxMeetingParticipants = 3;
      }

      await company.save();

      res.status(200).json({ success: true, data: company });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update subscription'
      });
    }
  }

  // Cancel subscription
  public async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const company = await Company.findOne({ companyAdmin: userId });
      
      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }

      await stripe.subscriptions.cancel(company.stripeSubscriptionId);
      
      company.subscriptionStatus = 'canceled';
      await company.save();

      res.status(200).json({ success: true, message: 'Subscription canceled' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel subscription'
      });
    }
  }

  // Update payment method
  public async updatePaymentMethod(req: Request, res: Response): Promise<void> {
    try {
      const { paymentMethodId } = req.body;
      const userId = req.user.id;

      const company = await Company.findOne({ companyAdmin: userId });
      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }

      const user = await User.findById(userId);
      if (!user?.stripeCustomerId) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId,
      });

      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      company.paymentMethodId = paymentMethodId;
      await company.save();

      res.status(200).json({ success: true, message: 'Payment method updated' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update payment method'
      });
    }
  }

  // Handle Stripe webhooks
  public async handleWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      res.status(400).send('Missing signature');
      return;
    }
    
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.updateSubscriptionStatus(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.updateSubscriptionFromInvoice(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleFailedPayment(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }

  private async updateSubscriptionStatus(subscription: any): Promise<void> {
    try {
      await Company.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        {
          subscriptionStatus: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        }
      );
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  }

  private async updateSubscriptionFromInvoice(invoice: any): Promise<void> {
    try {
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        await this.updateSubscriptionStatus(subscription);
      }
    } catch (error) {
      console.error('Error updating from invoice:', error);
    }
  }

  private async handleFailedPayment(invoice: any): Promise<void> {
    try {
      if (invoice.subscription) {
        await Company.findOneAndUpdate(
          { stripeSubscriptionId: invoice.subscription },
          { subscriptionStatus: 'past_due' }
        );
      }
    } catch (error) {
      console.error('Error handling failed payment:', error);
    }
  }
}