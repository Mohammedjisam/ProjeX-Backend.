// src/routes/password.routes.ts
import express from 'express';
const router = express.Router();
import { resetPassword, validateResetToken, extendTokenValidity } from '../controllers/auth/password.controller';

// Validate token route (GET)
router.get('/validate-token/:token', validateResetToken);

// Reset password route (POST)
router.post('/reset/:token', resetPassword);

// Add the token extension route (optional)
router.post('/extend-token/:token', extendTokenValidity);

export default router;