import express from 'express';
import { 
  initiateSignup, 
  verifyOTP, 
  resendOTP, 
  login, 
  googleAuth, 
  googleCallback,verifyGoogleToken   
} from '../controllers/auth/auth.controller';
import { updateProfile,getProfile } from '../controllers/auth/profileController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/signup/initiate', initiateSignup);
router.post('/signup/verify', verifyOTP);
router.post('/signup/resend', resendOTP);
router.post('/login', login);

router.put('/profile', protect, updateProfile);
router.get('/profile', protect, getProfile);



router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.post('/google/token', verifyGoogleToken);
export default router;