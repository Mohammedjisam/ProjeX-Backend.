import { Request, Response } from 'express';
import { User } from '../models/User';
import { v2 as cloudinary } from 'cloudinary';

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const updateProfile = async (req: Request, res: Response) => {
  try {
    // Access user from req.user, which is populated by the protect middleware
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const userId = req.user._id; // Using _id as it's the standard MongoDB identifier
    const { name, email, phoneNumber, profileImageBase64 } = req.body;
    let profileImage;
    
    // Check if user exists (redundant since middleware already checked, but good for safety)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if email is already in use by another user
    if (email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use by another account'
        });
      }
    }
    
    // Check if an image was provided as base64
    if (profileImageBase64 && profileImageBase64.startsWith('data:image')) {
      try {
        // Upload to cloudinary
        const uploadResponse = await cloudinary.uploader.upload(profileImageBase64, {
          folder: 'profiles',
          transformation: [
            { width: 250, height: 250, crop: 'fill' }
          ]
        });
        
        profileImage = uploadResponse.secure_url;
      } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        return res.status(400).json({
          success: false,
          message: 'Error uploading profile image'
        });
      }
    }
    
    // Prepare update data
    const updateData: any = { 
      name, 
      email, 
      phoneNumber
    };
    
    // Only add profileImage if it was uploaded
    if (profileImage) {
      updateData.profileImage = profileImage;
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const userId = req.user._id;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};