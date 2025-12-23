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
import mongoose from 'mongoose';
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
      // 1. Nếu không chọn danh mục hoặc chọn All -> Trả về tất cả
      if (!category || category === 'All') {
        return await Restaurant.find({}).populate('categories');
      }

      try {
        // 2. Logic mới: Tìm các nhà hàng CÓ BÁN món ăn thuộc category này

        // Bước A: Tìm tất cả các món ăn có category trùng khớp
        const foods = await Food.find({ category: category });

        if (!foods || foods.length === 0) {
          return []; // Không có món nào -> Không có nhà hàng nào
        }

        // Bước B: Lấy ra danh sách ID của chủ nhà hàng (restaurantId) từ các món ăn tìm được
        // Sử dụng Set để loại bỏ các ID trùng lặp
        const restaurantAccountIds = [...new Set(foods.map(f => f.restaurantId.toString()))];

        // Bước C: Tìm thông tin Restaurant Profile dựa trên danh sách accountId vừa lọc
        const restaurants = await Restaurant.find({
          accountId: { $in: restaurantAccountIds }
        }).populate('categories');

        return restaurants;

      } catch (error) {
        console.error("Lỗi getRestaurants:", error);
        return [];
      }
    },
    getFoods: async (_, { category }) => {
      if (!category || category === 'All') {
        return await Food.find({});
      }
      return await Food.find({ category });
    },
    getRunningOrders: async (_, __, context) => {
      // 1. Kiểm tra quyền (User phải đăng nhập)
      if (!context.userId) throw new Error("Unauthorized");

      // 2. Điều kiện lọc:
      // - status: 'preparing' (Quán đang làm hoặc đã làm xong)
      // - shipperId: null hoặc không tồn tại (Chưa có ai nhận)
      const filter = {
        status: 'preparing', // Hoặc ['preparing', 'ready'] tùy logic bạn
        $or: [
            { shipperId: { $exists: false } }, 
            { shipperId: null }
        ]
      };

      // 3. Trả về kết quả (Mới nhất lên đầu)
      return await Order.find(filter)
        .populate('restaurantId') // Populate thông tin quán để hiển thị địa chỉ quán
        .populate('customerId')   // Populate thông tin khách để hiển thị địa chỉ giao
        .sort({ createdAt: -1 });
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
        // Lấy cả đơn đang chuẩn bị và đơn đang giao/đã giao
        status: { $in: ['preparing', 'shipping', 'delivered', 'completed', 'cancelled'] }
      })
      .sort({ createdAt: -1 });
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
      // context thường chứa userId sau khi decode token (xem file context.js hoặc middleware auth)
      // Nếu context có user object thì dùng context.user._id hoặc context.userId tùy cách bạn setup context
      const userId = context.userId || (context.user && context.user._id) || (context.user && context.user.id);

      if (!userId) throw new Error('Bạn chưa đăng nhập!');

      // Log ra để debug xem userId có nhận được không
      console.log("Fetching orders for user:", userId);

      return await Order.find({ customerId: userId }).sort({ createdAt: -1 });
    },
    getOrder: async (_, { id }, context) => {
      if (!context.userId) throw new Error("Unauthorized");

      const order = await Order.findById(id);
      if (!order) throw new Error("Không tìm thấy đơn hàng");

      return order;
    },
    // Lấy thông tin Restaurant theo id
    restaurant: async (_, { id }) => {
      try {
        return await Restaurant.findById(id);
      } catch (err) {
        console.error('Error fetching restaurant by id', err);
        return null;
      }
    },
    // Query Shipper mới thêm
    getShipperProfile: async (_, __, context) => {
      if (!context.userId) throw new Error("Unauthorized");
      return await Shipper.findOne({ accountId: context.userId });
    },
    myCart: async (_, __, context) => {
      if (!context.userId) throw new Error("Unauthorized");
      const cart = await Cart.findOne({ userId: context.userId })
        .populate('items.foodId')
        .populate('items.restaurantId');

      if (!cart) return null;

      // Convert populated references to scalar IDs to match typeDefs
      const cartObj = cart.toObject ? cart.toObject() : cart;
      if (Array.isArray(cartObj.items)) {
        cartObj.items = cartObj.items.map(item => {
          const out = { ...item };
          if (out.foodId && typeof out.foodId === 'object') {
            out.foodId = out.foodId._id || out.foodId.id || null;
          }
          if (out.restaurantId && typeof out.restaurantId === 'object') {
            out.restaurantId = out.restaurantId._id || out.restaurantId.id || null;
          }
          return out;
        });
      }

      return cartObj;
    },
    getFood: async (_, { id }) => {
      try {
        return await Food.findById(id);
      } catch (err) {
        throw new Error("Không tìm thấy món ăn");
      }
    },
    getFoodsByRestaurant: async (_, { restaurantId, category }) => {
      // Thử tìm xem restaurantId gửi lên là AccountID hay RestaurantID

      // 1. Giả sử gửi lên là RestaurantID (ID của quán)
      const restaurantDoc = await Restaurant.findById(restaurantId);
      let targetAccountId = restaurantId;

      if (restaurantDoc) {
        // Nếu tìm thấy quán -> Lấy accountId của quán đó để tìm món ăn
        targetAccountId = restaurantDoc.accountId;
      }

      // 2. Tìm món ăn theo restaurantId (trong Food schema, restaurantId = accountId)
      const query = { restaurantId: targetAccountId };
      if (category && category !== 'All') {
        query.category = category;
      }
      return await Food.find(query);
    },
    myRestaurantProfile: async (_, __, context) => {
      // 1. Kiểm tra xem User ID có nhận được từ token không
      console.log("👉 Login User ID:", context.userId);

      if (!context.userId) throw new Error("Unauthorized");

      // 2. Log lệnh tìm kiếm
      const restaurant = await Restaurant.findOne({ accountId: context.userId });

      // 3. Kiểm tra kết quả
      console.log("👉 Found Restaurant:", restaurant);

      return restaurant;
    },

    myRestaurantOrders: async (_, { status }, context) => {
      if (!context.userId) throw new Error("Unauthorized");

      // --- SỬA LỖI TẠI ĐÂY ---
      // 1. Tìm thông tin Quán (Restaurant) dựa trên tài khoản đang đăng nhập (User ID)
      const restaurantProfile = await Restaurant.findOne({ accountId: context.userId });

      // 2. Xác định ID cần tìm kiếm trong bảng Order
      // Nếu tìm thấy quán -> Lấy _id của quán.
      // Nếu không thấy (trường hợp dữ liệu cũ) -> Dùng tạm userId.
      const targetId = restaurantProfile ? restaurantProfile._id : context.userId;

      console.log("👉 Fetching orders for Restaurant ID:", targetId); // Log để debug

      const filter = { restaurantId: targetId };

      // Nếu có status thì lọc
      if (status && status !== 'All') {
        filter.status = status;
      }

      return await Order.find(filter)
        .sort({ createdAt: -1 }); // Mới nhất lên đầu
    },
    getAllShippers: async (_, __, context) => {
      // Bạn có thể thêm kiểm tra quyền Admin ở đây nếu cần
      const shippers = await Shipper.find({});
      return shippers;
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
      if (!context.userId) throw new Error("Unauthorized");
      const updateData = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (avatar) updateData.avatar = avatar;
      if (address) updateData.address = address;
      return await User.findByIdAndUpdate(context.userId, updateData, { new: true });
    },
    updateFood: async (_, args) => {
      return await Food.findByIdAndUpdate(args.id, args, { new: true });
    },
    addReview: async (_, { foodId, orderId, rating, comment }, context) => {
      if (!context.userId) throw new Error("Unauthorized");
      const review = new Review({
        userId: context.userId,
        foodId,
        rating,
        comment
      });
      await review.save();
      return review;
    },
    updateCart: async (_, { items }, context) => {
      if (!context.userId) throw new Error("Unauthorized");

      // Tính tổng tiền luôn phía server cho an toàn
      // Ensure each item has restaurantId set (fallback to provided restaurantId)
      items = (items || []).map(item => ({
        ...item,
        restaurantId: item.restaurantId || null,
      }));

      let total = 0;
      items.forEach(item => {
        total += (item.price || 0) * (item.quantity || 0);
      });

      // Dùng findOneAndUpdate với option upsert: true
      // Nghĩa là: Nếu tìm thấy thì update, không thấy thì tạo mới
      const cart = await Cart.findOneAndUpdate(
        { userId: context.userId },
        {
          userId: context.userId,
          // Do not persist a root-level restaurantId; keep restaurantId on each item
          items,
          totalAmount: total
        },
        { new: true, upsert: true }
      );
      return cart;
    },
    createOrder: async (_, { input }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { restaurantId, items, totalAmount, paymentMethod, shippingAddress, shipperId } = input;
      if (!restaurantId) throw new Error('restaurantId required');
      // Validate restaurantId is a valid Mongo ObjectId to avoid BSON cast errors
      if (!mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new Error('Invalid restaurantId');
      }
      // Ensure items exist and belong to the provided restaurantId
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Order must contain at least one item');
      }
      // resolve food documents to verify restaurant ownership
      const foodIds = items.map(i => i.foodId).filter(Boolean);
      const foods = await Food.find({ _id: { $in: foodIds } });
      if (foods.length !== foodIds.length) {
        throw new Error('One or more items are invalid or do not exist');
      }
      const mismatched = foods.find(f => String(f.restaurantId) !== String(restaurantId));
      if (mismatched) {
        throw new Error('All items in an order must belong to the same restaurant');
      }
      const orderData = {
        customerId: context.userId,
        restaurantId,
        shipperId: shipperId || null,
        items: items || [],
        totalAmount: totalAmount || 0,
        paymentMethod: paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD',
        paymentStatus: paymentMethod === 'ONLINE' ? 'paid' : 'unpaid',
        shippingAddress: shippingAddress || {},
        status: 'pending',
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
            // await Cart.findOneAndDelete({ userId: context.userId });
          } else {
            // Recompute total
            let total = 0;
            remainingItems.forEach(it => { total += (it.price || 0) * (it.quantity || 0); });
            cart.items = remainingItems;
            cart.totalAmount = total;
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
    createOrders: async (_, { inputs }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      if (!Array.isArray(inputs) || inputs.length === 0) {
        throw new Error('inputs required');
      }

      const created = [];
      // collect all foodIds to remove from cart later
      const allPaidFoodIds = [];

      for (const input of inputs) {
        const { restaurantId, items, totalAmount, paymentMethod, shippingAddress, shipperId } = input;
        if (!restaurantId) throw new Error('restaurantId required for each order');
        if (!mongoose.Types.ObjectId.isValid(String(restaurantId))) {
          throw new Error('Invalid restaurantId');
        }

        if (!Array.isArray(items) || items.length === 0) {
          throw new Error('Each order must have at least one item');
        }

        const foodIds = items.map(i => i.foodId).filter(Boolean);
        const foods = await Food.find({ _id: { $in: foodIds } });
        if (foods.length !== foodIds.length) {
          throw new Error('One or more items are invalid or do not exist');
        }

        const orderData = {
          customerId: context.userId,
          restaurantId,
          shipperId: shipperId || null,
          items: items || [],
          totalAmount: totalAmount || 0,
          paymentMethod: paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD',
          paymentStatus: paymentMethod === 'ONLINE' ? 'paid' : 'unpaid',
          shippingAddress: shippingAddress || {},
          status: 'pending',
        };

        const newOrder = new Order(orderData);
        const saved = await newOrder.save();

        // socket emit
        try {
          const io = context?.io;
          if (io) io.to(`order_${restaurantId}`).emit('order_created', saved);
        } catch (e) { console.error('Socket emit error', e); }

        created.push(saved);
        allPaidFoodIds.push(...foodIds.map(f => String(f)));
      }

      // Remove paid items from cart in one update
      try {
        const cart = await Cart.findOne({ userId: context.userId });
        if (cart) {
          const remainingItems = (cart.items || []).filter(ci => !allPaidFoodIds.includes((ci.foodId || ci.id || '').toString()));
          if (remainingItems.length === 0) {
            // leave cart empty or delete depending on business rule
            cart.items = [];
            cart.totalAmount = 0;
            await cart.save();
          } else {
            let total = 0;
            remainingItems.forEach(it => { total += (it.price || 0) * (it.quantity || 0); });
            cart.items = remainingItems;
            cart.totalAmount = total;
            await cart.save();
          }
        }
      } catch (e) {
        console.error('Failed to remove paid items from cart after createOrders', e);
      }

      return created;
    },
    updateRestaurantStatus: async (_, { isOpen }, context) => {
      if (!context.userId) throw new Error("Unauthorized");
      const restaurant = await Restaurant.findOneAndUpdate(
        { accountId: context.userId },
        { isOpen },
        { new: true }
      );
      if (!restaurant) throw new Error("Không tìm thấy thông tin Quán");
      return restaurant;
    },
    updateOrderStatus: async (_, { orderId, status }, context) => {
      if (!context.userId) throw new Error("Unauthorized");

      const restaurantProfile = await Restaurant.findOne({ accountId: context.userId });
      if (!restaurantProfile) throw new Error("Bạn không phải là chủ nhà hàng!");

      const order = await Order.findOne({ _id: orderId, restaurantId: restaurantProfile._id });
      if (!order) throw new Error("Không tìm thấy đơn hàng!");

      // --- THÊM ĐIỀU KIỆN KIỂM TRA ---
      // Nếu nhà hàng muốn chuyển sang 'shipping', phải kiểm tra đã có Shipper chưa
      if (status === 'shipping') {
          if (!order.shipperId) {
              throw new Error("Chưa có tài xế nhận đơn! Vui lòng chờ tài xế.");
          }
      }

      order.status = status;
      
      // Logic gửi socket thông báo (nếu có)
      try {
        const io = context?.io;
        if (io) io.to(`order_${orderId}`).emit('order_status_updated', order);
      } catch (e) { console.error(e); }

      return await order.save();
    },
    shipperAcceptOrder: async (_, { orderId }, context) => {
      if (!context.userId) throw new Error("Unauthorized");
      
      // Kiểm tra xem user này có phải Shipper không
      const shipperProfile = await Shipper.findOne({ accountId: context.userId });
      if (!shipperProfile || !shipperProfile.isActive) {
        throw new Error("Bạn không phải là Shipper hoặc tài khoản đang bị khóa!");
      }

      // Tìm đơn hàng đang 'preparing' và chưa có shipper
      const order = await Order.findOne({ _id: orderId, status: 'preparing' });
      if (!order) throw new Error("Đơn hàng không khả dụng hoặc đã có người nhận!");

      order.shipperId = context.userId; // Lưu ID user của shipper
      return await order.save();
    },
    shipperUpdateStatus: async (_, { orderId, status }, context) => {
       if (!context.userId) throw new Error("Unauthorized");

       // Chỉ shipper sở hữu đơn này mới được update
       const order = await Order.findOne({ _id: orderId, shipperId: context.userId });
       if (!order) throw new Error("Không tìm thấy đơn hàng của bạn!");

       if (!['delivered', 'cancelled'].includes(status)) {
         throw new Error("Trạng thái không hợp lệ");
       }

       // --- LOGIC MỚI: CỘNG TIỀN VÀO VÍ ---
       // Nếu trạng thái mới là 'delivered' và trạng thái cũ CHƯA PHẢI là 'delivered' (tránh cộng nhiều lần)
       if (status === 'delivered' && order.status !== 'delivered') {
           order.paymentStatus = 'paid'; // Đánh dấu đã thanh toán (nếu cần)
           
           // Cộng 15.000đ vào ví Shipper (User model)
           const DELIVERY_FEE = 15000; 
           await User.findByIdAndUpdate(context.userId, { 
               $inc: { walletBalance: DELIVERY_FEE } 
           });
       }

       order.status = status;
       return await order.save();
    },
    customerCompleteOrder: async (_, { orderId }, context) => {
      if (!context.userId) throw new Error("Unauthorized");

      // Tìm đơn hàng của chính khách hàng đó
      const order = await Order.findOne({ _id: orderId, customerId: context.userId });
      
      if (!order) throw new Error("Không tìm thấy đơn hàng!");

      // Chỉ cho phép hoàn tất khi đơn đang ở trạng thái 'delivered'
      if (order.status !== 'delivered') {
        throw new Error("Đơn hàng chưa được giao, không thể hoàn tất!");
      }

      order.status = 'completed';
      return await order.save();
    },
    addToCart: async (_, { foodId, quantity, restaurantId }, context) => {
      if (!context.userId) throw new Error("Unauthorized");

      // 1. Tìm hoặc tạo giỏ hàng
      let cart = await Cart.findOne({ userId: context.userId });
      
      if (!cart) {
        cart = new Cart({
          userId: context.userId,
          items: [],
          totalAmount: 0
        });
      }

      // --- LOGIC TRỘN GIỎ HÀNG ---
      // Keep `restaurantId` on each item; do not persist a root-level restaurantId on Cart model

      // 2. Xử lý thêm/cộng dồn món ăn
      const itemIndex = cart.items.findIndex(p => p.foodId.toString() === foodId);
      
      const foodInfo = await Food.findById(foodId);
      if (!foodInfo) throw new Error("Món ăn không tồn tại");

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({
          foodId: foodId,
          // store restaurantId on each item for clarity
          restaurantId: restaurantId || null,
          name: foodInfo.name,
          price: foodInfo.price,
          quantity: quantity,
          image: foodInfo.image
        });
      }

      // 3. Tính tổng tiền
      let total = 0;
      for (const item of cart.items) {
          total += item.price * item.quantity;
      }
      cart.totalAmount = total;

        await cart.save();

        // Populate item-level refs
        return await cart.populate([
          { path: 'items.foodId' },
          { path: 'items.restaurantId' }
        ]);
    },
  },
};

export { resolvers };