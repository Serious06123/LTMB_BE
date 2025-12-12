// File: graphql/resolvers.js

import Food from '../models/Food.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

export const resolvers = {
  Query: {
    getFoods: async (_, { category }) => {
      if (!category || category === 'All') {
        return await Food.find({});
      }
      return await Food.find({ category });
    },
    getRunningOrders: async () => {
      // Lấy tất cả đơn đang chạy (cho chủ quán)
      return await Order.find({ status: { $in: ['preparing', 'shipping'] } });
    },
    myRunningOrders: async (_, { userId }) => {
       // Lấy đơn đang chạy của user cụ thể (cho khách hàng)
       return await Order.find({ 
           customerId: userId,
           status: { $in: ['preparing', 'shipping'] } 
       });
    },
  },
  Mutation: {
    login: async (_, { email, password }) => {
      // Tìm user bằng Mongoose Model
      const user = await User.findOne({ email });
      
      if (!user || user.password !== password) {
        return { success: false, error: 'Email hoặc mật khẩu không đúng' };
      }

      return { 
          success: true, 
          token: 'fake-jwt-token-tu-backend', 
          user: { ...user.toObject(), id: user._id }
      };
    },
    register: async (_, { name, email, password }) => {
      try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return { success: false, error: 'Email này đã được sử dụng' };
        }

        // Tạo user mới bằng Mongoose Model
        const newUser = new User({
          name,
          email,
          password, 
          role: 'customer', 
          avatar: 'https://picsum.photos/200/300',
        });

        // Lưu vào DB
        await newUser.save();
        
        return {
          success: true,
          token: 'fake-jwt-token-new',
          user: { ...newUser.toObject(), id: newUser._id }
        };
      } catch (err) {
        console.error(err);
        return { success: false, error: 'Lỗi server khi đăng ký' };
      }
    },
    
    // Đổi mật khẩu
    changePassword: async (_, { email, newPassword }) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return { success: false, error: 'Không tìm thấy người dùng' };
        }
        user.password = newPassword;
        await user.save();
        return { success: true, user: { ...user.toObject(), id: user._id } };
      } catch (err) {
        return { success: false, error: 'Lỗi server' };
      }
    },
  },
};