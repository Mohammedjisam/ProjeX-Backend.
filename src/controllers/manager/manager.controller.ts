// src/controllers/companyAdmin/manager.controller.ts
import { Request, Response } from 'express';
import { User } from '../../models/User';
import { sendEmail, generatePasswordResetEmailHtml } from '../../utils/email';

export const getManagers = async (req: Request, res: Response) => {
  try {
    // Log who is accessing managers data (for audit purposes)
    console.log(`User ${req.user._id} with role ${req.user.role} accessed managers data`);
    
    const managers = await User.find({ role: 'manager' }).select('name email phoneNumber');
    console.log("Managers data fetched:", managers.length);
    
    res.status(200).json({
      success: true,
      count: managers.length,
      data: managers
    });
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch managers',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getManagerById = async (req: Request, res: Response) => {
  try {
    // Log who is accessing manager details (for audit purposes)
    console.log(`User ${req.user._id} with role ${req.user.role} accessed manager ID: ${req.params.id}`);
    
    const manager = await User.findOne({ 
      _id: req.params.id,
      role: 'manager'
    });
    
    if (!manager) {
      return res.status(404).json({
        success: false,
        message: 'Manager not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: manager
    });
  } catch (error) {
    console.error('Error fetching manager:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch manager',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const createManager = async (req: Request, res: Response) => {
  try {
    const { name, email, phoneNumber } = req.body;
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }
    
    // Create new manager without password
    const manager = await User.create({
      name,
      email,
      phoneNumber,
      role: 'manager'
    });
    
    // Generate password reset token
    const resetToken = await manager.createPasswordResetToken();
    
    // Create password reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/manager/set-password/${resetToken}`;
    
    // Send email with password setup link
    try {
      await sendEmail({
        email: manager.email,
        subject: 'Welcome to Our Platform - Set Your Password',
        message: `Welcome to our platform! Please follow this link to set your password: ${resetUrl}`,
        html: generatePasswordResetEmailHtml(manager.name, resetUrl)
      });
      
      res.status(201).json({
        success: true,
        message: 'Manager created successfully. Password setup email sent.',
        data: {
          id: manager._id,
          name: manager.name,
          email: manager.email,
          phoneNumber: manager.phoneNumber
        }
      });
    } catch (emailError) {
      // If email sending fails, delete the user and return error
      await User.findByIdAndDelete(manager._id);
      
      console.error('Error sending password setup email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password setup email, manager not created',
        error: emailError instanceof Error ? emailError.message : String(emailError)
      });
    }
  } catch (error) {
    console.error('Error creating manager:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create manager',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const updateManager = async (req: Request, res: Response) => {
  try {
    const { name, email, phoneNumber } = req.body;
    
    // If email is being changed, check if new email is already in use
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }
    
    const manager = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'manager' },
      { name, email, phoneNumber },
      { new: true, runValidators: true }
    );
    
    if (!manager) {
      return res.status(404).json({
        success: false,
        message: 'Manager not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Manager updated successfully',
      data: {
        id: manager._id,
        name: manager.name,
        email: manager.email,
        phoneNumber: manager.phoneNumber
      }
    });
  } catch (error) {
    console.error('Error updating manager:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update manager',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const deleteManager = async (req: Request, res: Response) => {
  try {
    const manager = await User.findOneAndDelete({ 
      _id: req.params.id,
      role: 'manager'
    });
    
    if (!manager) {
      return res.status(404).json({
        success: false,
        message: 'Manager not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Manager deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting manager:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete manager',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};