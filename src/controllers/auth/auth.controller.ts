import { Request, Response  } from 'express';
import { User } from '../../models/User';
import { OTP } from '../../models/OTP';
import { generateOTP, sendOTP } from '../../utils/otpUtils';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { OAuth2Client } from 'google-auth-library';


const VALID_ROLES = ['admin', 'companyAdmin', 'manager', 'projectManager', 'developer'] as const;
type UserRole = typeof VALID_ROLES[number];


export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body; 
    
    // Input validation
    if (!VALID_ROLES.includes(role as UserRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: admin, companyAdmin, manager, projectManager, or developer',
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find any user with this email first
    const existingUser = await User.findOne({ email });
    
    // Check if email exists with different role
    if (existingUser && existingUser.role !== role) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access. This email is already associated with a different role in the system.',
      });
    }

    // Find user with exact email and role
    const user = await User.findOne({ email, role });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check for Google-authenticated users
    if (user.isGoogleAccount) {
      return res.status(401).json({
        success: false,
        message: 'Please login using Google authentication',
      });
    }

    // Validate password exists
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials - no password set for this user',
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '30d' }
    );

    // Successful login response
    res.status(200).json({
      success: true,
      message: `Login successful as ${role}`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login',
      error: error.message,
    });
  }
};
const pendingRegistrations = new Map();

export const initiateSignup = async (req: Request, res: Response) => {
  try {
    const { name, email, phoneNumber, password, role } = req.body;
    
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: admin, companyAdmin, manager, projectManager, or developer'
      });
    }

    console.log(`Checking if user exists (${role}):`, email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Existing user found:", existingUser);
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    console.log(`Generating OTP for ${role}:`, email);
    const otp = generateOTP();
    console.log("Generated OTP:", otp);

    await OTP.create({ email, otp });
    console.log("OTP stored in DB");

    pendingRegistrations.set(email, {
      name,
      email,
      phoneNumber,
      password,
      role
    });

    await sendOTP(email, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('Signup initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating signup',
      error: error.message
    });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const userData = pendingRegistrations.get(email);
    if (!userData) {
      return res.status(400).json({
        success: false,
        message: 'Registration data not found'
      });
    }

    const user = await User.create(userData);
    
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '30d' }
    );

    await OTP.deleteOne({ email });
    pendingRegistrations.delete(email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: error.message
    });
  }
};

export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!pendingRegistrations.has(email)) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found'
      });
    }
    
    await OTP.deleteOne({ email });
    
    const otp = generateOTP();
    await OTP.create({ email, otp });
    
    await sendOTP(email, otp);
    
    res.status(200).json({
      success: true,
      message: 'OTP resent successfully'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resending OTP',
      error: error.message
    });
  }
};

export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email']
});

export const googleCallback = [
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req: Request, res: Response) => {
    res.redirect('/dashboard');
  }
];

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const verifyGoogleToken = async (req: Request, res: Response) => {
  try {
    console.log('Google token verification request body:', req.body);
    const { credential, tokenId, role = 'companyAdmin' } = req.body;
    const token = credential || tokenId;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'No Google authentication token provided' 
      });
    }

    if (!VALID_ROLES.includes(role as UserRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: admin, companyAdmin, manager, projectManager, or developer',
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid token or missing email' 
      });
    }

    console.log('Google authentication successful for:', payload.email);
    
    const user = await User.findOne({ email: payload.email });
    
    if (!user) {
      const newUser = await User.create({
        name: payload.name || 'Google User',
        email: payload.email,
        isGoogleAccount: true,
        role,
      });
      console.log(`Created new user with role: ${role}`);
      
      const jwtToken = jwt.sign(
        { id: newUser._id, role: newUser.role },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        },
        token: jwtToken
      });
    } else {
      if (user.role !== role) {
        return res.status(403).json({
          success: false,
          message: `Unauthorized access. This email is already associated with a different role in the system.`
        });
      }
      
      console.log(`Found existing user with matching role: ${user.role}`);
      
      const jwtToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token: jwtToken
      });
    }
  } catch (error) {
    console.error('Google token verification error:', error);
    return res.status(400).json({ 
      success: false, 
      message: 'Failed to verify Google token',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};