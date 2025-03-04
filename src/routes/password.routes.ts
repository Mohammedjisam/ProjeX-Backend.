import express from 'express';
const router = express.Router();
import { resetPassword, validateResetToken, extendTokenValidity } from '../controllers/auth/password.controller';

router.get('/validate-token/:token', validateResetToken);

router.post('/reset/:token', resetPassword);

router.post('/extend-token/:token', extendTokenValidity);

export default router;