import mongoose, { Document, Schema } from 'mongoose';

export interface ICompany extends Document {
  // Company Information
  companyName: string;
  companyType: string;
  companyDomain: string;
  phoneNumber: string;
  address: {
    buildingNo: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  
  // Admin Information
  companyAdmin: mongoose.Types.ObjectId;
  adminVerification: boolean;
  
  // Payment Information
  planId: 'basic' | 'pro' | 'business';
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  paymentMethodId: string;
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  currentPeriodEnd: Date;
  
  // Subscription Limits
  maxBranches: number;
  maxUsers: number;
  maxMeetingParticipants: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema = new Schema(
  {
    // Company Information
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    companyType: {
      type: String,
      required: [true, 'Company type is required'],
      trim: true
    },
    companyDomain: {
      type: String,
      required: [true, 'Company domain is required'],
      trim: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    address: {
      buildingNo: {
        type: String,
        required: [true, 'Building number is required'],
        trim: true
      },
      street: {
        type: String,
        required: [true, 'Street is required'],
        trim: true
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true
      },
      postalCode: {
        type: String,
        required: [true, 'Postal code is required'],
        trim: true
      }
    },
    
    // Admin Information
    companyAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Company admin reference is required']
    },
    adminVerification: {
      type: Boolean,
      default: false
    },
    
    // Payment Information
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
    
    // Subscription Limits
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
    }
  },
  {
    timestamps: true
  }
);

// Set subscription limits based on plan
CompanySchema.pre('save', function(next) {
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

export default mongoose.model<ICompany>('Company', CompanySchema);