// src/controllers/companyAdmin/projectManager.controller.ts
import { Request, Response } from 'express';
import { User } from '../../models/User';
import { sendEmail, generatePasswordResetEmailHtml } from '../../utils/email';

export const getProjectManagers = async (req: Request, res: Response) => {
  try {
    // Log who is accessing project managers data (for audit purposes)
    console.log(`User ${req.user._id} with role ${req.user.role} accessed project managers data`);
    
    const projectManagers = await User.find({ role: 'projectManager' }).select('name email phoneNumber');
    console.log("Project Managers data fetched:", projectManagers.length);
    
    res.status(200).json({
      success: true,
      count: projectManagers.length,
      data: projectManagers
    });
  } catch (error) {
    console.error('Error fetching project managers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project managers',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getProjectManagerById = async (req: Request, res: Response) => {
  try {
    // Log who is accessing project manager details (for audit purposes)
    console.log(`User ${req.user._id} with role ${req.user.role} accessed project manager ID: ${req.params.id}`);
    
    const projectManager = await User.findOne({ 
      _id: req.params.id,
      role: 'projectManager'
    });
    
    if (!projectManager) {
      return res.status(404).json({
        success: false,
        message: 'Project Manager not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: projectManager
    });
  } catch (error) {
    console.error('Error fetching project manager:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project manager',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const createProjectManager = async (req: Request, res: Response) => {
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
    
    // Create new project manager without password
    const projectManager = await User.create({
      name,
      email,
      phoneNumber,
      role: 'projectManager'
    });
    
    // Generate password reset token
    const resetToken = await projectManager.createPasswordResetToken();
    
    // Create password reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/projectmanager/set-password/${resetToken}`;
    
    // Send email with password setup link
    try {
      await sendEmail({
        email: projectManager.email,
        subject: 'Welcome to Our Platform - Set Your Password',
        message: `Welcome to our platform! Please follow this link to set your password: ${resetUrl}`,
        html: generatePasswordResetEmailHtml(projectManager.name, resetUrl)
      });
      
      res.status(201).json({
        success: true,
        message: 'Project Manager created successfully. Password setup email sent.',
        data: {
          id: projectManager._id,
          name: projectManager.name,
          email: projectManager.email,
          phoneNumber: projectManager.phoneNumber
        }
      });
    } catch (emailError) {
      // If email sending fails, delete the user and return error
      await User.findByIdAndDelete(projectManager._id);
      
      console.error('Error sending password setup email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password setup email, project manager not created',
        error: emailError instanceof Error ? emailError.message : String(emailError)
      });
    }
  } catch (error) {
    console.error('Error creating project manager:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project manager',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const updateProjectManager = async (req: Request, res: Response) => {
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
    
    const projectManager = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'projectManager' },
      { name, email, phoneNumber },
      { new: true, runValidators: true }
    );
    
    if (!projectManager) {
      return res.status(404).json({
        success: false,
        message: 'Project Manager not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Project Manager updated successfully',
      data: {
        id: projectManager._id,
        name: projectManager.name,
        email: projectManager.email,
        phoneNumber: projectManager.phoneNumber
      }
    });
  } catch (error) {
    console.error('Error updating project manager:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project manager',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const deleteProjectManager = async (req: Request, res: Response) => {
  try {
    const projectManager = await User.findOneAndDelete({ 
      _id: req.params.id,
      role: 'projectManager'
    });
    
    if (!projectManager) {
      return res.status(404).json({
        success: false,
        message: 'Project Manager not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Project Manager deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project manager:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project manager',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};