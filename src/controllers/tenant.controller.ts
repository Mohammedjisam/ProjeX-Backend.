// controllers/tenant.controller.ts
import { Request, Response } from 'express';
import Tenant, { ITenant } from '../models/Tenant';
import { User, IUser } from '../models/User';
import { Payment } from '../models/Payment';

export default class TenantController {
  /**
   * Create a new tenant
   * @route POST /api/tenants
   */
  public async createTenant(req: Request, res: Response): Promise<void> {
    try {
      console.log("Received request body:", req.body);
      
      // Destructure the request body
      const {
        companyName,
        companyType,
        companyDomain,
        phoneNumber,
        address,
        paymentId,
        userId
      } = req.body;

    //   const {paymentId} = req.params
      
      // Check for required fields
      if (!companyName || !companyType || !companyDomain || !phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'Missing required company information'
        });
        return;
      }
      
      // Extract address fields, handling both nested and flat structures
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
  
      // Get user from database to use as company admin
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'Missing required user ID'
        });
        return;
      }
      
      try {
        // Fetch user to get company admin
        const user = await User.findById(userId);
        if (!user) {
          res.status(404).json({
            success: false,
            message: 'User not found'
          });
          return;
        }
        
        // Find company where this user is a company admin
        const company = await Payment.findOne({ companyAdmin: user._id });
        if (!company) {
          res.status(404).json({
            success: false,
            message: 'Company not found for this user'
          });
          return;
        }
        
        // Create tenant with all the required information
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
          payment: paymentId,  // Map paymentId to payment field
          companyAdmin: userId
    });
    
        const savedTenant = await tenant.save();
        
        res.status(201).json({
          success: true,
          data: savedTenant
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
      console.error("Error creating tenant:", error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create tenant'
      });
    }
  }
  
  /**
   * Get all tenants
   * @route GET /api/tenants
   */
  public async getAllTenants(req: Request, res: Response): Promise<void> {
    try {
      const tenants = await Tenant.find()
        .populate('company')
        .populate('companyAdmin', 'name email');
      
      res.status(200).json({
        success: true,
        count: tenants.length,
        data: tenants
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve tenants'
      });
    }
  }

  /**
   * Get tenant by ID
   * @route GET /api/tenants/:id
   */
  public async getTenantById(req: Request, res: Response): Promise<void> {
    try {
      const tenant = await Tenant.findById(req.params.id)
        .populate('company')
        .populate('companyAdmin', 'name email');
      
      if (!tenant) {
        res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: tenant
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve tenant'
      });
    }
  }

  /**
   * Update tenant
   * @route PUT /api/tenants/:id
   */
  public async updateTenant(req: Request, res: Response): Promise<void> {
    try {
      const {
        companyName,
        companyType,
        companyDomain,
        phoneNumber,
        address,
        company,
        companyAdmin
      } = req.body;

      const updateData: any = {};
      
      if (companyName) updateData.companyName = companyName;
      if (companyType) updateData.companyType = companyType;
      if (companyDomain) updateData.companyDomain = companyDomain;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      
      // Handle address update
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
      
      if (company) updateData.company = company;
      if (companyAdmin) updateData.companyAdmin = companyAdmin;

      const tenant = await Tenant.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate('company').populate('companyAdmin');
      
      if (!tenant) {
        res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: tenant
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update tenant'
      });
    }
  }

  /**
   * Delete tenant
   * @route DELETE /api/tenants/:id
   */
  public async deleteTenant(req: Request, res: Response): Promise<void> {
    try {
      const tenant = await Tenant.findByIdAndDelete(req.params.id);
      
      if (!tenant) {
        res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Tenant deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete tenant'
      });
    }
  }
}