import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
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
  payment: mongoose.Types.ObjectId; // Reference to the Payment schema
  companyAdmin: mongoose.Types.ObjectId; // Reference to the company admin
  adminVerification: boolean; // Added adminVerification field
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema: Schema = new Schema(
  {
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
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment reference is required']
    },
    companyAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Company admin reference is required']
    },
    adminVerification: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<ITenant>('Tenant', TenantSchema);