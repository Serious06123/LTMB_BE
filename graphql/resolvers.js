import Food from '../models/Food.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import sendEmail from '../utils/sendEmail.js'; 

const resolvers = {
  Query: {
    getFoods: async (_, { category }) => {
      if (!category || category === 'All') {
        return await Food.find({});
      }
      return await Food.find({ category });
    },
    getRunningOrders: async () => {
      return await Order.find({ status: { $in: ['preparing', 'shipping'] } });
    },
    myRunningOrders: async (_, { userId }) => {
       return await Order.find({ 
           customerId: userId,
           status: { $in: ['preparing', 'shipping'] } 
       });
    },
  },

  Mutation: {
    // 1. ĐĂNG NHẬP
    login: async (_, { identifier, password }) => {
      const user = await User.findOne({
        $or: [{ email: identifier }, { phone: identifier }]
      });

      if (!user) throw new Error('Tài khoản không tồn tại!');

      // Kiểm tra xác thực (Bật lên để chặn user chưa xác thực)
      if (!user.isVerified) {
         throw new Error('Tài khoản chưa được xác thực. Vui lòng kiểm tra email để lấy OTP!');
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error('Mật khẩu không đúng!');

      const token = jwt.sign(
        { userId: user._id, role: user.role }, 
        process.env.JWT_SECRET || 'SECRET_KEY',
        { expiresIn: '7d' }
      );

      return { token, user };
    },

    // 2. ĐĂNG KÝ
    register: async (_, { name, email, password, phone, role }) => {
      // Check trùng
      const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
      if (existingUser) {
        throw new Error('Email hoặc số điện thoại đã được sử dụng!');
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser = new User({
        name,
        email,
        phone,
        password: hashedPassword,
        role: role || 'customer',
        isVerified: false 
      });
      await newUser.save();

      // Tạo OTP 4 số
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

      await Otp.create({
        email,
        otp: otpCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });

      // --- GỌI HÀM GỬI MAIL CỦA BẠN ---
      try {
        await sendEmail(email, otpCode);
      } catch (error) {
        console.error("Gửi mail lỗi:", error);
      }

      return "Đăng ký thành công! Vui lòng kiểm tra Email để lấy mã OTP.";
    },

    // 3. XÁC THỰC OTP (Bắt buộc phải có)
    verifyOtp: async (_, { email, otp }) => {
      const otpRecord = await Otp.findOne({ email, otp });
      
      if (!otpRecord) throw new Error('Mã OTP không đúng!');
      if (otpRecord.expiresAt < new Date()) throw new Error('Mã OTP đã hết hạn!');

      const user = await User.findOne({ email });
      if (!user) throw new Error('Không tìm thấy tài khoản!');

      // Kích hoạt user
      user.isVerified = true;
      await user.save();

      await Otp.deleteOne({ _id: otpRecord._id });

      // Trả về token để user tự động đăng nhập luôn
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'SECRET_KEY',
        { expiresIn: '7d' }
      );

      return { token, user };
    },
    
    // 4. ĐỔI MẬT KHẨU
    changePassword: async (_, { email, newPassword }) => {
      try {
        const user = await User.findOne({ email });
        if (!user) return { success: false, error: 'Không tìm thấy người dùng' };
        
        // Nhớ hash password mới
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        
        await user.save();
        return { success: true, user: { ...user.toObject(), id: user._id } };
      } catch (err) {
        return { success: false, error: 'Lỗi server' };
      }
    },
  },
};

export { resolvers };