import express from 'express';
import { googleLogin } from '../controllers/authController.js';
import { sendOtp } from '../controllers/authController.js';
import { verifyOtp } from '../controllers/authController.js';
import { resendOtp } from '../controllers/authController.js';

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/google', googleLogin);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
export default router;
