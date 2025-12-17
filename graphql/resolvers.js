import Food from '../models/Food.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import Category from '../models/Category.js';
import Message from '../models/Message.js';
import Restaurant from '../models/Restaurant.js';
import Review from '../models/Review.js';
import Shipper from '../models/Shipper.js'; 
import Cart from '../models/Cart.js';
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
  Food: {
    // Resolver này giúp lấy thông tin Restaurant khi query Food
    restaurant: async (parent) => {
      // parent.restaurantId là ID của User (role restaurant)
      // Chúng ta cần tìm trong bảng Restaurant có accountId khớp với User ID đó
      return await Restaurant.findOne({ accountId: parent.restaurantId });
    }
  },
  Query: {
    getCategories: async () => {
      return await Category.find({ isActive: true }).sort({ createdAt: -1 });
    },
    getRestaurants: async (_, { category }) => {
      if (!category || category === 'All') {
        return await Restaurant.find({}).populate('categories');
      }
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
      if (!context.userId) throw new Error("Bạn chưa đăng nhập!");
      return await Order.find({
        shipperId: context.userId,
        status: { $in: ['shipping', 'delivered', 'completed', 'cancelled'] }
      }).sort({ createdAt: -1 });
    },
    me: async (_, __, context) => {
      if (!context.userId) throw new Error("Bạn chưa đăng nhập!");
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
      if (!context.userId) throw new Error("Bạn chưa đăng nhập!");
      const query = { restaurantId: context.userId };
      if (category && category !== 'All') {
        query.category = category;
      }
      return await Food.find(query).sort({ createdAt: -1 });
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
      return await Order.find({ customerId: context.user.id }).sort({ createdAt: -1 });
    },
    // Query Shipper mới thêm
    getShipperProfile: async (_, __, context) => {
       if (!context.userId) throw new Error("Unauthorized");
       return await Shipper.findOne({ accountId: context.userId });
    },
    myCart: async (_, __, context) => {
      if (!context.userId) throw new Error("Unauthorized");
      // Tìm giỏ hàng, nếu chưa có thì trả về null hoặc object rỗng tùy ý
      return await Cart.findOne({ userId: context.userId });
    },
    getFood: async (_, { id }) => {
      try {
        return await Food.findById(id);
      } catch (err) {
        throw new Error("Không tìm thấy món ăn");
      }
    },
  },

  Mutation: {
    // --- SỬA LOGIC REGISTER ---
    register: async (_, { name, email, password, phone, role }) => {
      // 1. Kiểm tra tồn tại
      const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
      if (existingUser) {
        throw new Error('Email hoặc số điện thoại đã được sử dụng!');
      }

      // 2. Tạo User
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = new User({
        name,
        email,
        phone,
        password: hashedPassword,
        role: role || 'customer',
        isVerified: false
      });
      
      const savedUser = await newUser.save(); // Lưu user để lấy _id

      // 3. Tự động tạo Profile dựa trên Role
      try {
        if (role === 'restaurant') {
          await Restaurant.create({
            name: name, // Lấy tên user làm tên quán mặc định
            accountId: savedUser._id,
            image: '',
            address: {},
            categories: [], // Mảng rỗng ban đầu
            isOpen: true,
            deliveryTime: '30 min',
            deliveryFee: 15000 // Phí mặc định
          });
        } else if (role === 'shipper') {
          await Shipper.create({
            name: name,
            accountId: savedUser._id,
            image: '',
            address: { lat: 0, lng: 0 },
            isActive: true
          });
        }
      } catch (err) {
        console.error("Lỗi khi tạo profile phụ:", err);
        // Không throw error để user vẫn đăng ký được tài khoản chính, 
        // có thể bổ sung profile sau.
      }

      // 4. Tạo OTP và gửi mail (Logic cũ)
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
          io.to(`order_${orderId}`).emit('message_received', out);
        }
      } catch (e) { console.error('Emit error', e); }
      return out;
    },
    markMessagesRead: async (_, { orderId, userId }) => {
      await Message.updateMany({ orderId, receiverId: userId, isRead: false }, { isRead: true });
      return true;
    },
    createFood: async (_, args, context) => {
      if (!context.userId) throw new Error("Unauthorized");
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
      } catch (error) { throw new Error(error.message); }
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
    
    // --- Shipper Mutations ---
    createShipper: async (_, { name, image, lat, lng }, context) => {
      if (!context.userId) throw new Error("Unauthorized");
      const existingShipper = await Shipper.findOne({ accountId: context.userId });
      if (existingShipper) throw new Error("Tài khoản này đã đăng ký làm Shipper rồi!");

      const newShipper = new Shipper({
        name,
        image,
        accountId: context.userId,
        address: { lat: lat || 0, lng: lng || 0 },
        isActive: true
      });
      return await newShipper.save();
    },
    updateShipperStatus: async (_, { isActive }, context) => {
      if (!context.userId) throw new Error("Unauthorized");
      const shipper = await Shipper.findOneAndUpdate(
        { accountId: context.userId },
        { isActive },
        { new: true }
      );
      if (!shipper) throw new Error("Không tìm thấy thông tin Shipper");
      return shipper;
    },

    createCategory: async (_, { name, image }) => {
       const cat = new Category({ name, image, isActive: true });
       return await cat.save();
    },
    updateProfile: async (_, { name, phone, avatar, address }, context) => {
       if(!context.userId) throw new Error("Unauthorized");
       const updateData = {};
       if(name) updateData.name = name;
       if(phone) updateData.phone = phone;
       if(avatar) updateData.avatar = avatar;
       if(address) updateData.address = address;
       return await User.findByIdAndUpdate(context.userId, updateData, { new: true });
    },
    updateFood: async (_, args) => {
      return await Food.findByIdAndUpdate(args.id, args, { new: true });
    },
    addReview: async (_, { foodId, orderId, rating, comment }, context) => {
       if(!context.userId) throw new Error("Unauthorized");
       const review = new Review({
         userId: context.userId,
         foodId,
         rating,
         comment
       });
       await review.save();
       return review;
    },
    updateCart: async (_, { restaurantId, items }, context) => {
      if (!context.userId) throw new Error("Unauthorized");

      // Tính tổng tiền luôn phía server cho an toàn
      let total = 0;
      items.forEach(item => {
        total += item.price * item.quantity;
      });

      // Dùng findOneAndUpdate với option upsert: true
      // Nghĩa là: Nếu tìm thấy thì update, không thấy thì tạo mới
      const cart = await Cart.findOneAndUpdate(
        { userId: context.userId },
        { 
          userId: context.userId,
          restaurantId,
          items,
          totalAmount: total
        },
        { new: true, upsert: true } // upsert: true là chìa khóa
      );
      return cart;
    },
    createOrder: async (_, { input }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { restaurantId, items, totalAmount, paymentMethod, shippingAddress } = input;
      if (!restaurantId) throw new Error('restaurantId required');

      const orderData = {
        customerId: context.userId,
        restaurantId,
        items: items || [],
        totalAmount: totalAmount || 0,
        paymentMethod: paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD',
        paymentStatus: paymentMethod === 'ONLINE' ? 'paid' : 'unpaid',
        shippingAddress: shippingAddress || {},
      };

      const newOrder = new Order(orderData);

      // Save order
      const saved = await newOrder.save();

      // Remove only the items that were paid from the user's cart.
      // If the cart belongs to the same restaurant, remove the matching items;
      // if the cart becomes empty afterward, delete the cart document.
      try {
        const cart = await Cart.findOne({ userId: context.userId });
        if (cart) {
          // If cart.restaurantId differs from order.restaurantId, we only
          // remove items that match foodIds in the order and belonging to that restaurant.
          const paidFoodIds = (items || []).map(i => i.foodId?.toString()).filter(Boolean);

          // Filter out items from cart that are in paidFoodIds
          const remainingItems = (cart.items || []).filter(ci => !paidFoodIds.includes((ci.foodId || ci.id || '').toString()));

          if (remainingItems.length === 0) {
            await Cart.findOneAndDelete({ userId: context.userId });
          } else {
            // Recompute total
            let total = 0;
            remainingItems.forEach(it => { total += (it.price || 0) * (it.quantity || 0); });
            cart.items = remainingItems;
            cart.totalAmount = total;
            cart.restaurantId = remainingItems.length > 0 ? cart.restaurantId : null;
            await cart.save();
          }
        }
      } catch (e) {
        console.error('Failed to remove paid items from cart after order', e);
      }

      // Emit socket event to restaurant room if io available
      try {
        const io = context?.io;
        if (io) {
          io.to(`order_${restaurantId}`).emit('order_created', saved);
        }
      } catch (e) {
        console.error('Socket emit error', e);
      }

      return saved;
    },
    clearCart: async (_, __, context) => {
      if (!context.userId) throw new Error("Unauthorized");
      await Cart.findOneAndDelete({ userId: context.userId });
      return true;
    }
  },
};

export { resolvers };