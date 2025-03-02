import { Request, Response  } from 'express';
import { User } from '../models/User';
import { OTP } from '../models/OTP';
import { generateOTP, sendOTP } from '../utils/otpUtils';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { OAuth2Client } from 'google-auth-library';


// Define valid roles
const VALID_ROLES = ['admin', 'companyAdmin', 'manager', 'projectManager', 'developer'] as const;
type UserRole = typeof VALID_ROLES[number];


export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body; // Extract role from req.body
    console.log("Extracted role:", role);

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

    console.log(`Attempting login for ${role}:`, email);

    // First check if the user exists with any role
    const existingUser = await User.findOne({ email });
    
    // If user exists but with a different role, return unauthorized
    if (existingUser && existingUser.role !== role) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access. This email is already associated with a different role in the system.',
      });
    }

    // Now find the user with the correct role
    const user = await User.findOne({ email, role });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '30d' }
    );

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
    console.error("Login Error:", error.message);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login',
      error: error.message,
    });
  }
};

// Temporary storage for pending registrations
const pendingRegistrations = new Map();

export const initiateSignup = async (req: Request, res: Response) => {
  try {
    const { name, email, phoneNumber, password, role } = req.body;
    
    // Validate role
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: admin, companyAdmin, manager, projectManager, or developer'
      });
    }

    console.log(`Checking if user exists (${role}):`, email);
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Existing user found:", existingUser);
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate and store OTP
    console.log(`Generating OTP for ${role}:`, email);
    const otp = generateOTP();
    console.log("Generated OTP:", otp);

    await OTP.create({ email, otp });
    console.log("OTP stored in DB");

    // Store registration data temporarily with the validated role
    pendingRegistrations.set(email, {
      name,
      email,
      phoneNumber,
      password,
      role
    });

    // Send OTP
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

    // Verify OTP
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Get pending registration data
    const userData = pendingRegistrations.get(email);
    if (!userData) {
      return res.status(400).json({
        success: false,
        message: 'Registration data not found'
      });
    }

    // Create user with the role set during initiation
    const user = await User.create(userData);
    
    // Generate token with appropriate role
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '30d' }
    );

    // Clean up
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
    
    // Check if there's a pending registration for this email
    if (!pendingRegistrations.has(email)) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found'
      });
    }
    
    // Delete old OTP if exists
    await OTP.deleteOne({ email });
    
    // Generate new OTP
    const otp = generateOTP();
    await OTP.create({ email, otp });
    
    // Send the new OTP
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
    // Successful authentication logic
    res.redirect('/dashboard');
  }
];

// Add the missing verifyGoogleToken function
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const verifyGoogleToken = async (req: Request, res: Response) => {
  try {
    console.log('Google token verification request body:', req.body);
    // Support both credential (new) and tokenId (old) formats
    const { credential, tokenId, role = 'companyAdmin' } = req.body;
    const token = credential || tokenId;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'No Google authentication token provided' 
      });
    }

    // Validate role
    if (!VALID_ROLES.includes(role as UserRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: admin, companyAdmin, manager, projectManager, or developer',
      });
    }

    // Verify the token with Google
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
    
    // Find user with this email
    const user = await User.findOne({ email: payload.email });
    
    if (!user) {
      // Create new user with provided role
      const newUser = await User.create({
        name: payload.name || 'Google User',
        email: payload.email,
        isGoogleAccount: true,
        role,
      });
      console.log(`Created new user with role: ${role}`);
      
      // Generate JWT token for new user
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
      // User exists - check if role matches
      if (user.role !== role) {
        // User exists with a different role - return unauthorized error
        return res.status(403).json({
          success: false,
          message: `Unauthorized access. This email is already associated with a different role in the system.`
        });
      }
      
      console.log(`Found existing user with matching role: ${user.role}`);
      
      // Generate JWT token for existing user with matching role
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