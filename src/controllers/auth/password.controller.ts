import { Request, Response } from 'express';
import { User } from '../../models/User';
import crypto from 'crypto';

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    console.log('[resetPassword] Processing reset request for token:', token);
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
      
    console.log('[resetPassword] Hashed token:', hashedToken);
    console.log('[resetPassword] Current time:', new Date().toISOString(), '(', Date.now(), ')');
    
    let user = await User.findOne({
      passwordResetToken: hashedToken
    });
    
    if (user) {
      console.log('[resetPassword] User found:', { 
        id: user._id, 
        email: user.email,
        tokenExpires: user.passwordResetExpires ? new Date(user.passwordResetExpires).toISOString() : 'undefined' 
      });
      
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

export const validateResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    console.log('[validateResetToken] Validating token:', token);
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
      
    console.log('[validateResetToken] Hashed token:', hashedToken);
    console.log('[validateResetToken] Current time:', new Date().toISOString(), '(', Date.now(), ')');
    
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
    
    if (user.passwordResetExpires && user.passwordResetExpires < Date.now()) {
      console.log('[validateResetToken] Token expired. Expiry:', new Date(user.passwordResetExpires).toISOString());
      return res.status(400).json({
        success: false,
        message: 'Password reset token has expired'
      });
    }
    
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

export const extendTokenValidity = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { hours = 24 } = req.body; 
    
    console.log('[extendTokenValidity] Extending token validity:', token);
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this reset token'
      });
    }
    
    const newExpiryTime = Date.now() + (hours * 60 * 60 * 1000);
    
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