import Otp from '../models/Otp.js';
import User from '../models/User.js';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

import sendEmail from '../utils/sendEmail.js'; 
import dotenv from 'dotenv';
dotenv.config();

// Hàm sinh OTP ngẫu nhiên
function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// 1. GỬI LẠI OTP (RESEND)
export async function resendOtp(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Thiếu email' });

  try {
    // Xóa OTP cũ
    await Otp.deleteMany({ email });

    // Tạo OTP mới
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Lưu DB
    await Otp.create({ email, otp, expiresAt });

    // Gửi mail (Dùng hàm chung)
    await sendEmail(email, otp);

    return res.json({ success: true, message: 'Đã gửi lại mã OTP' });
  } catch (err) {
    console.error('Error resending OTP', err);
    return res.status(500).json({ success: false, error: 'Lỗi gửi mail' });
  }
}

// 2. XÁC THỰC OTP (VERIFY) -> QUAN TRỌNG: Phải update User
export async function verifyOtp(req, res) {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, error: 'Thiếu email hoặc otp' });

  try {
    const otpDoc = await Otp.findOne({ email, otp });
    
    if (!otpDoc) {
      return res.status(400).json({ success: false, error: 'Sai mã OTP' });
    }
    if (otpDoc.expiresAt < new Date()) {
      return res.status(400).json({ success: false, error: 'OTP đã hết hạn' });
    }

    // --- CẬP NHẬT TRẠNG THÁI USER ---
    const user = await User.findOne({ email });
    if (user) {
        user.isVerified = true;
        await user.save();
    }
    // --------------------------------

    // Xóa OTP đã dùng
    await Otp.deleteOne({ _id: otpDoc._id });
    
    return res.json({ success: true, message: 'Xác thực thành công', user });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Lỗi server' });
  }
}

// 3. GỬI OTP (SEND - Dùng cho quên mật khẩu hoặc login lần đầu bằng REST)
export async function sendOtp(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Thiếu email' });

  try {
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Lưu OTP
    await Otp.create({ email, otp, expiresAt });

    // Gửi mail
    await sendEmail(email, otp);

    return res.json({ success: true, message: 'Đã gửi mã OTP' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Lỗi gửi mail' });
  }
}

// 4. GOOGLE LOGIN
export async function googleLogin(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success: false, error: 'Missing idToken' });

    // Verify Google Token
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!tokenInfoRes.ok) return res.status(400).json({ success: false, error: 'Invalid id token' });
    
    const tokenInfo = await tokenInfoRes.json();

    if (process.env.GOOGLE_CLIENT_ID && tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ success: false, error: 'Token audience mismatch' });
    }

    const email = tokenInfo.email;
    const name = tokenInfo.name || (email ? email.split('@')[0] : '');
    const avatar = tokenInfo.picture || '';

    // Tìm hoặc tạo User
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name,
        email,
        password: '', // Google login không có password
        role: 'customer',
        avatar,
        phone: '', // Google không trả về phone, user sẽ cập nhật sau
        isVerified: true // Google đã xác thực email rồi
      });
      await user.save();
    } else {
      // Cập nhật thông tin nếu có thay đổi
      let changed = false;
      if (avatar && user.avatar !== avatar) { user.avatar = avatar; changed = true; }
      if (name && user.name !== name) { user.name = name; changed = true; }
      if (!user.isVerified) { user.isVerified = true; changed = true; } // Update luôn trạng thái
      if (changed) await user.save();
    }

    // Tạo JWT Token riêng của hệ thống mình trả về cho Client
    const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'SECRET_KEY',
        { expiresIn: '7d' }
    );

    return res.json({ success: true, token, user: { ...user.toObject(), id: user._id } });
  } catch (err) {
    console.error('googleLogin error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}