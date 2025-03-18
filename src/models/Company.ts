import mongoose, { Document, Schema } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  admin: mongoose.Types.ObjectId;
  planId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  paymentMethodId: string;
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  currentPeriodEnd: Date;
  maxBranches: number;
  maxUsers: number;
  maxMeetingParticipants: number;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    zip: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Company admin is required'],
    },
    planId: {
      type: String,
      required: [true, 'Plan ID is required'],
      enum: ['basic', 'pro', 'business'],
    },
    stripeCustomerId: {
      type: String,
      required: [true, 'Stripe customer ID is required'],
    },
    stripeSubscriptionId: {
      type: String,
      required: [true, 'Stripe subscription ID is required'],
    },
    paymentMethodId: {
      type: String,
      required: [true, 'Payment method ID is required'],
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'trialing', 'incomplete'],
      default: 'active',
    },
    currentPeriodEnd: {
      type: Date,
      required: [true, 'Current period end date is required'],
    },
    maxBranches: {
      type: Number,
      required: [true, 'Maximum number of branches is required'],
    },
    maxUsers: {
      type: Number,
      required: [true, 'Maximum number of users is required'],
    },
    maxMeetingParticipants: {
      type: Number,
      required: [true, 'Maximum number of meeting participants is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Set the plan limits based on the selected plan
companySchema.pre('save', function(next) {
  if (this.isNew || this.isModified('planId')) {
    switch (this.planId) {
      case 'basic':
        this.maxBranches = 1;
        this.maxUsers = 10;
        this.maxMeetingParticipants = 3;
        break;
      case 'pro':
        this.maxBranches = 3;
        this.maxUsers = 30;
        this.maxMeetingParticipants = 5;
        break;
      case 'business':
        this.maxBranches = 5;
        this.maxUsers = 50;
        this.maxMeetingParticipants = 10;
        break;
      default:
        this.maxBranches = 1;
        this.maxUsers = 10;
        this.maxMeetingParticipants = 3;
    }
  }
  next();
});

export const Company = mongoose.model<ICompany>('Company', companySchema);