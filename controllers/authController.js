import nodemailer from 'nodemailer';
import Otp from '../models/Otp.js';
import fetch from 'node-fetch';
import User from '../models/User.js';


// Hàm sinh OTP ngẫu nhiên
function generateOtp(length = 4) {
  return Math.floor(1000 + Math.random() * 9000).toString();
}


// Hàm gửi lại OTP
export async function resendOtp(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Missing email' });

  // Sinh OTP mới
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Xóa OTP cũ nếu có
  await Otp.deleteMany({ email });
  // Lưu OTP mới
  await Otp.create({ email, otp, expiresAt });

  // Gửi email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'daituongdarius22@gmail.com',
      pass: 'ennnhiwsozcdnbpf',
    },
  });
  const mailOptions = {
    from: 'daituongdarius22@gmail.com',
    to: email,
    subject: 'Mã xác nhận OTP',
    text: `Mã OTP mới của bạn là: ${otp}. Mã sẽ hết hạn sau 5 phút.`,
  };
  try {
    await transporter.sendMail(mailOptions);
    return res.json({ success: true, message: 'OTP resent' });
  } catch (err) {
    console.error('Error resending email', err);
    return res.status(500).json({ success: false, error: 'Failed to resend email' });
  }
}


// Hàm xác thực OTP
export async function verifyOtp(req, res) {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, error: 'Missing email or otp' });

  const otpDoc = await Otp.findOne({ email, otp });
  if (!otpDoc) {
    return res.status(400).json({ success: false, error: 'Sai mã OTP' });
  }
  if (otpDoc.expiresAt < new Date()) {
    return res.status(400).json({ success: false, error: 'OTP đã hết hạn' });
  }

  // Nếu hợp lệ, có thể xóa OTP khỏi DB để tránh dùng lại
  await Otp.deleteOne({ _id: otpDoc._id });
  return res.json({ success: true, message: 'OTP hợp lệ' });
}


// Hàm gửi OTP
export async function sendOtp(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Missing email' });

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP hết hạn sau 5 phút

  // Lưu OTP vào DB
  await Otp.create({ email, otp, expiresAt });

    // Cấu hình transporter 
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'daituongdarius22@gmail.com', // Thay bằng Gmail của bạn
        pass: 'ennnhiwsozcdnbpf',    // Thay bằng app password của Gmail
      },
    });


  // Nội dung email
  const mailOptions = {
    from: 'daituongdarius22@gmail.com',
    to: email,
    subject: 'Mã xác nhận OTP',
    text: `Mã OTP của bạn là: ${otp}. Mã sẽ hết hạn sau 5 phút.`,
  };


  // Gửi email
  try {
    await transporter.sendMail(mailOptions);
    return res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    //console.error('Error sending email', err);
    return res.status(500).json({ success: false, error: 'Failed to send email' });
  }
}


// Hàm xử lý đăng nhập bằng Google
export async function googleLogin(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, error: 'Missing idToken' });
    }

    // xác minh token với Google
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!tokenInfoRes.ok) {
      return res.status(400).json({ success: false, error: 'Invalid id token' });
    }
    const tokenInfo = await tokenInfoRes.json();

    // Kiểm tra audience nếu cần
    if (process.env.GOOGLE_CLIENT_ID && tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ success: false, error: 'Token audience mismatch' });
    }

    const email = tokenInfo.email;
    const name = tokenInfo.name || (email ? email.split('@')[0] : '');
    const avatar = tokenInfo.picture || '';

    // Tìm hoặc tạo user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name,
        email,
        password: '',
        role: 'customer',
        avatar,
      });
      await user.save();
    } else {
      let changed = false;
      if (avatar && user.avatar !== avatar) { user.avatar = avatar; changed = true; }
      if (name && user.name !== name) { user.name = name; changed = true; }
      if (changed) await user.save();
    }

    return res.json({ success: true, user: { ...user.toObject(), id: user._id } });
  } catch (err) {
    console.error('googleLogin error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
