import { Request, Response } from 'express';
import { User } from '../../models/User';
import { sendEmail, generatePasswordResetEmailHtml } from '../../utils/email';

export const getDevelopers = async (req: Request, res: Response) => {
  try {
    console.log(`User ${req.user._id} with role ${req.user.role} accessed developers data`);
    
    const developers = await User.find({ role: 'developer' }).select('name email phoneNumber');
    console.log("Developers data fetched:", developers.length);
    
    res.status(200).json({
      success: true,
      count: developers.length,
      data: developers
    });
  } catch (error) {
    console.error('Error fetching developers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch developers',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getDeveloperById = async (req: Request, res: Response) => {
  try {
    console.log(`User ${req.user._id} with role ${req.user.role} accessed developer ID: ${req.params.id}`);
    
    const developer = await User.findOne({ 
      _id: req.params.id,
      role: 'developer'
    });
    
    if (!developer) {
      return res.status(404).json({
        success: false,
        message: 'Developer not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: developer
    });
  } catch (error) {
    console.error('Error fetching developer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch developer',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const createDeveloper = async (req: Request, res: Response) => {
  try {
    const { name, email, phoneNumber } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }
    
    const developer = await User.create({
      name,
      email,
      phoneNumber,
      role: 'developer'
    });
    
    const resetToken = await developer.createPasswordResetToken();
    
    const resetUrl = `${process.env.FRONTEND_URL}/developer/set-password/${resetToken}`;
    
    try {
      await sendEmail({
        email: developer.email,
        subject: 'Welcome to Our Platform - Set Your Password',
        message: `Welcome to our platform! Please follow this link to set your password: ${resetUrl}`,
        html: generatePasswordResetEmailHtml(developer.name, resetUrl)
      });
      
      res.status(201).json({
        success: true,
        message: 'Developer created successfully. Password setup email sent.',
        data: {
          id: developer._id,
          name: developer.name,
          email: developer.email,
          phoneNumber: developer.phoneNumber
        }
      });
    } catch (emailError) {
      await User.findByIdAndDelete(developer._id);
      
      console.error('Error sending password setup email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password setup email, developer not created',
        error: emailError instanceof Error ? emailError.message : String(emailError)
      });
    }
  } catch (error) {
    console.error('Error creating developer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create developer',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const updateDeveloper = async (req: Request, res: Response) => {
  try {
    const { name, email, phoneNumber } = req.body;
    
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
    
    const developer = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'developer' },
      { name, email, phoneNumber },
      { new: true, runValidators: true }
    );
    
    if (!developer) {
      return res.status(404).json({
        success: false,
        message: 'Developer not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Developer updated successfully',
      data: {
        id: developer._id,
        name: developer.name,
        email: developer.email,
        phoneNumber: developer.phoneNumber
      }
    });
  } catch (error) {
    console.error('Error updating developer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update developer',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const deleteDeveloper = async (req: Request, res: Response) => {
  try {
    const developer = await User.findOneAndDelete({ 
      _id: req.params.id,
      role: 'developer'
    });
    
    if (!developer) {
      return res.status(404).json({
        success: false,
        message: 'Developer not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Developer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting developer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete developer',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};