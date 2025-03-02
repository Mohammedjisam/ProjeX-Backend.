// src/controllers/auth/password.controller.ts
import { Request, Response } from 'express';
import { User } from '../../models/User';
import crypto from 'crypto';

// Verify password reset token and let user set new password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    console.log('[resetPassword] Processing reset request for token:', token);
    
    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
      
    console.log('[resetPassword] Hashed token:', hashedToken);
    console.log('[resetPassword] Current time:', new Date().toISOString(), '(', Date.now(), ')');
    
    // Find user with valid token
    let user = await User.findOne({
      passwordResetToken: hashedToken
    });
    
    // Log user found and check if token is expired
    if (user) {
      console.log('[resetPassword] User found:', { 
        id: user._id, 
        email: user.email,
        tokenExpires: user.passwordResetExpires ? new Date(user.passwordResetExpires).toISOString() : 'undefined' 
      });
      
      // Separate check for expiration to provide better error message
      if (user.passwordResetExpires && user.passwordResetExpires < Date.now()) {
        console.log('[resetPassword] Token expired. Expiry:', new Date(user.passwordResetExpires).toISOString());
        return res.status(400).json({
          success: false,
          message: 'Password reset token has expired'
        });
      }
    } else {
      console.log('[resetPassword] No user found with this token');
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid'
      });
    }
    
    // Set new password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    await user.save();
    console.log('[resetPassword] Password updated successfully for user:', user.email);
    
    res.status(200).json({
      success: true,
      message: 'Password set successfully'
    });
  } catch (error) {
    console.error('[resetPassword] Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Verify if token is valid (used for frontend to check before showing password form)
export const validateResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    console.log('[validateResetToken] Validating token:', token);
    
    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
      
    console.log('[validateResetToken] Hashed token:', hashedToken);
    console.log('[validateResetToken] Current time:', new Date().toISOString(), '(', Date.now(), ')');
    
    // First find user with the token without checking expiration
    let user = await User.findOne({
      passwordResetToken: hashedToken
    });
    
    if (!user) {
      console.log('[validateResetToken] No user found with this token');
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid'
      });
    }
    
    console.log('[validateResetToken] User found:', { 
      id: user._id, 
      email: user.email,
      tokenExpires: user.passwordResetExpires ? new Date(user.passwordResetExpires).toISOString() : 'undefined' 
    });
    
    // Check if token is expired
    if (user.passwordResetExpires && user.passwordResetExpires < Date.now()) {
      console.log('[validateResetToken] Token expired. Expiry:', new Date(user.passwordResetExpires).toISOString());
      return res.status(400).json({
        success: false,
        message: 'Password reset token has expired'
      });
    }
    
    // If we reach here, token is valid
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('[validateResetToken] Error validating reset token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate token',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Add a function to extend token validity (for admin/debugging use)
export const extendTokenValidity = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { hours = 24 } = req.body; // Default to extending by 24 hours
    
    console.log('[extendTokenValidity] Extending token validity:', token);
    
    // Hash the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with this token
    const user = await User.findOne({
      passwordResetToken: hashedToken
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this reset token'
      });
    }
    
    // Calculate new expiration time
    const newExpiryTime = Date.now() + (hours * 60 * 60 * 1000);
    
    // Update expiration time
    user.passwordResetExpires = newExpiryTime;
    await user.save();
    
    console.log('[extendTokenValidity] Token validity extended to:', new Date(newExpiryTime).toISOString());
    
    res.status(200).json({
      success: true,
      message: `Token validity extended by ${hours} hours`,
      expiresAt: new Date(newExpiryTime).toISOString()
    });
  } catch (error) {
    console.error('[extendTokenValidity] Error extending token validity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend token validity',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};