import Food from '../models/Food.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import Category from '../models/Category.js';
import Message from '../models/Message.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import sendEmail from '../utils/sendEmail.js'; 

const resolvers = {
  Review: {
    user: async (parent) => {
      return await parent.populate('userId').then(p => p.userId);
    }
  },
  Order: {
    restaurant: async (parent) => {
      // Tìm User đóng vai trò là quán ăn dựa trên restaurantId
      return await User.findById(parent.restaurantId);
    }
  },
  Query: {
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
    // Lịch sử đơn hàng của Shipper
    myShippingOrders: async (_, { userId }) => {
       return await Order.find({ 
           status: { $in: ['shipping', 'delivered', 'completed', 'cancelled'] } 
       });
    },

    // Lấy profile user hiện tại
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

      // Normalize output
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
      // 1. Lấy ID từ Token (context)
      if (!context.userId) {
        throw new Error("Bạn chưa đăng nhập!");
      }

      // 2. Query theo ID của người đang đăng nhập
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
      
      // Tìm đơn hàng của customerId trùng với user đang login
      // Sắp xếp theo ngày tạo mới nhất (createdAt: -1)
      const orders = await Order.find({ customerId: context.user.id })
                                .sort({ createdAt: -1 });
      return orders;
    },
  },
  Mutation: {
    // 1. ĐĂNG NHẬP
    login: async (_, { identifier, email, password }) => {
      const lookup = identifier || email;
      if (!lookup) throw new Error('Vui lòng cung cấp email hoặc identifier');

      const user = await User.findOne({
        $or: [{ email: lookup }, { phone: lookup }]
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

      return { token, user, success: true, error: null };
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

      return { token, user, success: true, error: null };
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
    sendMessage: async (_, { orderId, receiverId, content, messageType = 'text' }, context) => {
      // auth
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

      // Emit via Socket.IO if available in context
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
      // Bây giờ context.userId đã có dữ liệu nhờ sửa file server.js
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
          restaurantId: context.userId // Lấy ID từ token
        });

        return await newFood.save();
      } catch (error) {
        throw new Error("Lỗi tạo món: " + error.message);
      }
    },
    
    // --- THÊM: Tạo Category ---
    createCategory: async (_, { name, image }) => {
      const newCat = new Category({ name, image });
      return await newCat.save();
    },

    // --- THÊM: Update Profile ---
    updateProfile: async (_, args, context) => {
      if (!context.userId) throw new Error("Unauthorized");

      const updateData = {};
      if (args.name) updateData.name = args.name;
      if (args.phone) updateData.phone = args.phone;
      if (args.avatar) updateData.avatar = args.avatar;
      if (args.address) updateData.address = args.address;

      const updatedUser = await User.findByIdAndUpdate(
        context.userId,
        updateData,
        { new: true } // Trả về data mới sau khi update
      );

      return updatedUser;
    },
    updateFood: async (_, { id, name, price, description, image, category, isAvailable }) => { 
      try {
        // Tạo object chứa các trường cần update
        const updateFields = {
          name,
          price,
          description,
          image,
          category
        };
        if (isAvailable !== undefined) {
          updateFields.isAvailable = isAvailable;
        }
        // Loại bỏ các trường null/undefined để tránh ghi đè sai
        Object.keys(updateFields).forEach(key => updateFields[key] === undefined && delete updateFields[key]);

        const updatedFood = await Food.findByIdAndUpdate(
          id,
          updateFields,
          { new: true } // Trả về dữ liệu mới sau khi update
        );

        return updatedFood;
      } catch (err) {
        throw new Error(err);
      }
    },
    addReview: async (_, { foodId, orderId, rating, comment }, context) => {
      // 1. Kiểm tra đăng nhập
      if (!context.user) throw new Error('Bạn chưa đăng nhập');
      const userId = context.user.id;

      // 2. Kiểm tra xem đơn hàng đã hoàn thành chưa (Status = 'delivered' hoặc 'completed')
      const order = await Order.findById(orderId);
      if (!order) throw new Error('Đơn hàng không tồn tại');
      if (order.status !== 'delivered' && order.status !== 'completed') { // Kiểm tra status của bạn
         throw new Error('Bạn chỉ được đánh giá khi đơn hàng đã giao xong');
      }

      // 3. Tạo Review mới
      const newReview = new Review({
        userId,
        foodId,
        orderId,
        rating,
        comment
      });
      await newReview.save();

      // 4. Tính toán lại rating trung bình cho món ăn (Food)
      const reviews = await Review.find({ foodId });
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = (totalRating / reviews.length).toFixed(1);

      // 5. Cập nhật vào bảng Food
      await Food.findByIdAndUpdate(foodId, {
        rating: parseFloat(avgRating),
        reviews: reviews.length
      });

      return newReview;
    },
  },

  Order: {
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
};

export { resolvers };