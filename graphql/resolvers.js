import Food from '../models/Food.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import Category from '../models/Category.js';
import Message from '../models/Message.js';
import Category from '../models/Category.js';
import Restaurant from '../models/Restaurant.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail.js';

const resolvers = {
  Review: {
    user: async (parent) => {
      return await parent.populate('userId').then(p => p.userId);
    }
  },

  // --- GỘP TẤT CẢ LOGIC CỦA ORDER VÀO ĐÂY ---
  Order: {
    restaurant: async (parent) => {
      // Tìm User đóng vai trò là quán ăn dựa trên restaurantId
      return await User.findById(parent.restaurantId);
    },
    customerUser: async (parent) => {
      return await User.findOne({ _id: parent.customerId, role: "customer" });
    },
    restaurantUser: async (parent) => {
      return await User.findOne({ _id: parent.restaurantId, role: "restaurant" });
    },
    restaurantFood: async (parent) => {
      return await Food.findOne({ restaurantId: parent.restaurantId })
    }
  },

  Query: {
    getCategories: async () => {
      return await Category.find({ isActive: true }).sort({ createdAt: -1 });
    },
    getRestaurants: async (_, { category }) => {
      // If category param is provided, find restaurants that have that category id or name
      if (!category || category === 'All') {
        return await Restaurant.find({}).populate('categories');
      }

      // Try to accept either category id or name
      const cat = await Category.findOne({ $or: [{ _id: category }, { name: category }] });
      if (cat) {
        return await Restaurant.find({ categories: cat._id }).populate('categories');
      }

      return await Restaurant.find({}).populate('categories');
    },
    getFoods: async (_, { category }) => {
      if (!category || category === 'All') {
        return await Food.find({});
      }
      return await Food.find({ category });
    },
    getRunningOrders: async () => {
      return await Order.find({ status: { $in: ['preparing',] } });
    },
    myRunningOrders: async (_, { userId }) => {
      return await Order.find({
        customerId: userId,
        status: { $in: ['shipping'] }
      });
    },
    myShippingOrders: async (_, __, context) => {
      // 1. Kiểm tra đăng nhập
      if (!context.userId) {
        throw new Error("Bạn chưa đăng nhập!");
      }

      // 2. Tìm đơn hàng mà shipperId trùng với người đang login
      // Thêm .sort({ createdAt: -1 }) để đơn mới nhất hiện lên đầu
      return await Order.find({
        shipperId: context.userId,
        status: { $in: ['shipping', 'delivered', 'completed', 'cancelled'] }
      }).sort({ createdAt: -1 });
    },
    me: async (_, __, context) => {
      if (!context.userId) {
        throw new Error("Bạn chưa đăng nhập!");
      }
      return await User.findById(context.userId);
    },
    messages: async (_, { orderId, limit = 50, offset = 0 }) => {
      const msgs = await Message.find({ orderId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('senderId', 'name avatar');
      return msgs.map((m) => ({
        _id: m._id,
        orderId: m.orderId,
        senderId: m.senderId?._id || m.senderId,
        senderName: m.senderId?.name || null,
        receiverId: m.receiverId,
        content: m.content,
        messageType: m.messageType,
        isRead: m.isRead,
        createdAt: m.createdAt,
      }));
    },
    myFoods: async (_, { category }, context) => {
      if (!context.userId) {
        throw new Error("Bạn chưa đăng nhập!");
      }
      const query = { restaurantId: context.userId };
      if (category && category !== 'All') {
        query.category = category;
      }
      return await Food.find(query).sort({ createdAt: -1 });
    },
    getCategories: async () => {
      return await Category.find({ isActive: true });
    },
    getUserProfile: async (_, { id }) => {
      try {
        const user = await User.findById(id);
        if (!user) throw new Error("Không tìm thấy người dùng");
        return user;
      } catch (error) {
        console.log(error);
        return null;
      }
    },
    getFoodReviews: async (_, { foodId }) => {
      return await Review.find({ foodId }).populate('userId').sort({ createdAt: -1 });
    },
    myOrders: async (_, __, context) => {
      if (!context.user) throw new Error('Bạn chưa đăng nhập!');
      const orders = await Order.find({ customerId: context.user.id })
        .sort({ createdAt: -1 });
      return orders;
    },
  },

  Mutation: {
    // ... Giữ nguyên code Mutation cũ của bạn ...
    login: async (_, { identifier, email, password }) => {
      const lookup = identifier || email;
      if (!lookup) throw new Error('Vui lòng cung cấp email hoặc identifier');
      const user = await User.findOne({
        $or: [{ email: lookup }, { phone: lookup }]
      });
      if (!user) throw new Error('Tài khoản không tồn tại!');
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
      return { token, user, success: true, error: null };
    },
    register: async (_, { name, email, password, phone, role }) => {
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
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
      await Otp.create({
        email,
        otp: otpCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });
      try {
        await sendEmail(email, otpCode);
      } catch (error) {
        console.error("Gửi mail lỗi:", error);
      }
      return "Đăng ký thành công! Vui lòng kiểm tra Email để lấy mã OTP.";
    },
    verifyOtp: async (_, { email, otp }) => {
      const otpRecord = await Otp.findOne({ email, otp });
      if (!otpRecord) throw new Error('Mã OTP không đúng!');
      if (otpRecord.expiresAt < new Date()) throw new Error('Mã OTP đã hết hạn!');
      const user = await User.findOne({ email });
      if (!user) throw new Error('Không tìm thấy tài khoản!');
      user.isVerified = true;
      await user.save();
      await Otp.deleteOne({ _id: otpRecord._id });
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'SECRET_KEY',
        { expiresIn: '7d' }
      );
      return { token, user, success: true, error: null };
    },
    changePassword: async (_, { email, newPassword }) => {
      try {
        const user = await User.findOne({ email });
        if (!user) return { success: false, error: 'Không tìm thấy người dùng' };
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        await user.save();
        return { success: true, user: { ...user.toObject(), id: user._id } };
      } catch (err) {
        return { success: false, error: 'Lỗi server' };
      }
    },
    sendMessage: async (_, { orderId, receiverId, content, messageType = 'text' }, context) => {
      const token = context?.token || '';
      function verifyTokenLocal(t) {
        if (!t) return null;
        try {
          return jwt.verify(t.replace('Bearer ', ''), process.env.JWT_SECRET || 'SECRET_KEY');
        } catch (err) {
          return null;
        }
      }
      const payload = verifyTokenLocal(token);
      if (!payload) throw new Error('Unauthorized');
      const senderId = payload.userId;
      const order = await Order.findById(orderId);
      if (!order) throw new Error('Order not found');
      const isValidPair = (senderId.toString() === order.customerId.toString() && receiverId === order.shipperId?.toString()) ||
        (senderId.toString() === order.shipperId?.toString() && receiverId === order.customerId.toString());
      if (!isValidPair) throw new Error('Invalid sender/receiver for this order');
      const msg = await Message.create({ orderId, senderId, receiverId, content, messageType });
      const populated = await Message.findById(msg._id).populate('senderId', 'name avatar');
      const out = {
        _id: populated._id,
        orderId: populated.orderId,
        senderId: populated.senderId._id,
        senderName: populated.senderId.name,
        receiverId: populated.receiverId,
        content: populated.content,
        messageType: populated.messageType,
        isRead: populated.isRead,
        createdAt: populated.createdAt,
      };
      try {
        const io = context?.io;
        if (io) {
          const room = `order_${orderId}`;
          io.to(room).emit('message_received', out);
        }
      } catch (e) {
        console.error('Emit error', e);
      }
      return out;
    },
    markMessagesRead: async (_, { orderId, userId }) => {
      await Message.updateMany({ orderId, receiverId: userId, isRead: false }, { isRead: true });
      return true;
    },
    createFood: async (_, args, context) => {
      if (!context.userId) {
        throw new Error("Bạn chưa đăng nhập (Unauthorized)!");
      }
      try {
        const newFood = new Food({
          name: args.name,
          price: args.price,
          description: args.description,
          image: args.image,
          category: args.category,
          restaurantId: context.userId
        });
        return await newFood.save();
      } catch (error) {
        throw new Error("Lỗi tạo món: " + error.message);
      }
    },
    createRestaurant: async (_, args, context) => {
      if (!context.userId) throw new Error('Unauthorized');

      const newR = new Restaurant({
        name: args.name,
        accountId: context.userId,
        categories: args.categories || [],
        image: args.image || '',
        address: args.address || {},
        isOpen: typeof args.isOpen === 'boolean' ? args.isOpen : true,
        deliveryTime: args.deliveryTime || '',
        deliveryFee: args.deliveryFee || 0,
      });

      return await newR.save();
    },
    
  },
};

export { resolvers };