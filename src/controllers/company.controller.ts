// controllers/company.controller.ts
import { Request, Response } from 'express';
import Tenant, { ITenant } from '../models/Tenant';
import { User, IUser } from '../models/User';
import { Payment } from '../models/Payment';
import mongoose from 'mongoose';


export default class CompanyController {
  public async createCompany(req: Request, res: Response): Promise<void> {
    try {
      console.log("Received request body:", req.body);
      const {
        companyName,
        companyType,
        companyDomain,
        phoneNumber,
        address,
        paymentId,
        userId
      } = req.body;
      
      if (!companyName || !companyType || !companyDomain || !phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'Missing required company information'
        });
        return;
      }
      
      const addressData = address || {};
      const buildingNo = addressData.buildingNo || req.body.buildingNo;
      const street = addressData.street || req.body.street;
      const city = addressData.city || req.body.city;
      const state = addressData.state || req.body.state;
      const country = addressData.country || req.body.country;
      const postalCode = addressData.postalCode || req.body.postalCode;
      
      if (!buildingNo || !street || !city || !state || !country || !postalCode) {
        res.status(400).json({
          success: false,
          message: 'Missing required address information'
        });
        return;
      }
  
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'Missing required user ID'
        });
        return;
      }
      
      try {
        const user = await User.findById(userId);
        if (!user) {
          res.status(404).json({
            success: false,
            message: 'User not found'
          });
          return;
        }
        
        const company = await Payment.findOne({ companyAdmin: user._id });
        if (!company) {
          res.status(404).json({
            success: false,
            message: 'Company not found for this user'
          });
          return;
        }
        
        const tenant = new Tenant({
          companyName,
          companyType,
          companyDomain,
          phoneNumber,
          address: {
            buildingNo,
            street,
            city,
            state,
            country,
            postalCode
          },
          payment: paymentId, 
          companyAdmin: userId,
          adminVerification: false
        });
    
        const savedCompany = await tenant.save();
        
        res.status(201).json({
          success: true,
          data: savedCompany
        });
      } catch (err) {
        console.error("Error finding user or company:", err);
        res.status(500).json({
          success: false,
          message: 'Error processing user or company data'
        });
        return;
      }
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create company'
      });
    }
  }
  

  public async getAllCompanies(req: Request, res: Response): Promise<void> {
    try {
      const companies = await Tenant.find()
        .populate('payment')
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

  public async getCompanyById(req: Request, res: Response): Promise<void> {
    try {
      const rawTenant = await Tenant.findById(req.params.id).lean();
      
      if (!rawTenant) {
        res.status(404).json({
          success: false,
          message: 'Company not found'
        });
        return;
      }
      
      const paymentData = await mongoose.model('Payment').findById(rawTenant.company).select('planId subscriptionStatus currentPeriodEnd maxBranches maxUsers maxMeetingParticipants');
      const companyAdmin = await mongoose.model('User').findById(rawTenant.companyAdmin).select('name email');
      const responseData = {
        ...rawTenant,
        payment: paymentData,
        companyAdmin: companyAdmin 
      };
      
      res.status(200).json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('Error fetching company:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve company'
      });
    }
  }

  public async updateCompany(req: Request, res: Response): Promise<void> {
    try {
      const {
        companyName,
        companyType,
        companyDomain,
        phoneNumber,
        address,
        payment,
        companyAdmin,
        adminVerification
      } = req.body;

      const updateData: any = {};
      
      if (companyName) updateData.companyName = companyName;
      if (companyType) updateData.companyType = companyType;
      if (companyDomain) updateData.companyDomain = companyDomain;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      
      if (address) {
        updateData.address = {};
        if (address.buildingNo) updateData.address.buildingNo = address.buildingNo;
        if (address.street) updateData.address.street = address.street;
        if (address.city) updateData.address.city = address.city;
        if (address.state) updateData.address.state = address.state;
        if (address.country) updateData.address.country = address.country;
        if (address.postalCode) updateData.address.postalCode = address.postalCode;
      } else {
        if (req.body.buildingNo) {
          updateData.address = updateData.address || {};
          updateData.address.buildingNo = req.body.buildingNo;
        }
        if (req.body.street) {
          updateData.address = updateData.address || {};
          updateData.address.street = req.body.street;
        }
        if (req.body.city) {
          updateData.address = updateData.address || {};
          updateData.address.city = req.body.city;
        }
        if (req.body.state) {
          updateData.address = updateData.address || {};
          updateData.address.state = req.body.state;
        }
        if (req.body.country) {
          updateData.address = updateData.address || {};
          updateData.address.country = req.body.country;
        }
        if (req.body.postalCode) {
          updateData.address = updateData.address || {};
          updateData.address.postalCode = req.body.postalCode;
        }
      }
      
      if (payment) updateData.payment = payment;
      if (companyAdmin) updateData.companyAdmin = companyAdmin;

      const company = await Tenant.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate('payment').populate('companyAdmin');
      
      if (!company) {
        res.status(404).json({
          success: false,
          message: 'Company not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: company
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update company'
      });
    }
  }

  public async deleteCompany(req: Request, res: Response): Promise<void> {
    try {
      const company = await Tenant.findByIdAndDelete(req.params.id);
      
      if (!company) {
        res.status(404).json({
          success: false,
          message: 'Company not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Company deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete company'
      });
    }
  }

 public async toggleAdminVerification(req: Request, res: Response): Promise<void> {
  try {
    const result = await Tenant.findByIdAndUpdate(
      req.params.id,
      { $set: { adminVerification: !(await Tenant.findById(req.params.id))?.adminVerification } },
      { new: true }
    );
    
    if (!result) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: result,
      message: `Admin verification ${result.adminVerification ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to toggle admin verification'
    });
  }
}
}