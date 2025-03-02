// 3. Update auth routes (src/routes/auth.routes.ts) to ensure all paths are correctly defined

import express from 'express';
import { 
  initiateSignup, 
  verifyOTP, 
  resendOTP, 
  login, 
  googleAuth, 
  googleCallback,verifyGoogleToken   
} from '../controllers/auth.controller';

const router = express.Router();

// Regular auth routes
router.post('/signup/initiate', initiateSignup);
router.post('/signup/verify', verifyOTP);
router.post('/signup/resend', resendOTP);
router.post('/login', login);

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.post('/google/token', verifyGoogleToken);
export default router;