import mongoose from 'mongoose';
import 'dotenv/config'; 

import Order from './models/Order.js';
import User from './models/User.js';
import Food from './models/Food.js';

// Cấu hình số lượng đơn hàng muốn tạo
const ORDERS_TO_CREATE = 20;

const connectToDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối MongoDB để seed data!');
  } catch (e) {
    console.error('❌ Lỗi kết nối:', e);
    process.exit(1);
  }
};

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateOrders = async () => {
  await connectToDb();

  try {
    // 1. Lấy đầy đủ các role: Customer, Restaurant, Shipper
    const customers = await User.find({ role: 'customer' });
    const restaurants = await User.find({ role: 'restaurant' });
    const shippers = await User.find({ role: 'shipper' }); // <--- THÊM: Lấy danh sách Shipper

    // Validate dữ liệu
    if (customers.length === 0 || restaurants.length === 0) {
      console.log('❌ Cần ít nhất 1 Customer và 1 Restaurant trong DB.');
      process.exit(1);
    }
    
    // Cảnh báo nếu không có shipper nhưng vẫn chạy (để tạo đơn pending)
    if (shippers.length === 0) {
        console.log('⚠️ CẢNH BÁO: Không tìm thấy Shipper nào. Các đơn hàng shipping/delivered sẽ bị lỗi hoặc thiếu shipperId.');
    }

    console.log(`ℹ️ Data source: ${customers.length} Customers | ${restaurants.length} Restaurants | ${shippers.length} Shippers`);
    console.log('⏳ Đang tạo dữ liệu đơn hàng...');

    const createdOrders = [];

    for (let i = 0; i < ORDERS_TO_CREATE; i++) {
      const customer = getRandomItem(customers);
      const restaurant = getRandomItem(restaurants);
      
      // Lấy menu của quán
      const foods = await Food.find({ restaurantId: restaurant._id });
      if (foods.length === 0) continue;

      // Chọn món
      const numberOfItems = getRandomInt(1, 4);
      const orderItems = [];
      let totalAmount = 0;

      for (let j = 0; j < numberOfItems; j++) {
        const food = getRandomItem(foods);
        const quantity = getRandomInt(1, 3);
        
        orderItems.push({
          foodId: food._id,
          name: food.name,
          price: food.price,
          quantity: quantity,
          image: food.image
        });
        totalAmount += food.price * quantity;
      }

      // --- LOGIC RANDOM TRẠNG THÁI & SHIPPER ---
      const rand = Math.random();
      let status = 'pending';
      let shipperId = null; // Mặc định không có shipper
      let createdAt = new Date();

      // Lưu ý: Đảm bảo enum này khớp với file models/Order.js của bạn
      // enum: ['pending', 'preparing', 'shipping', 'delivered', 'cancelled', 'completed']
      
      if (rand < 0.4) { 
        // 40%: Đã giao thành công (hoặc completed nếu bạn đã thêm vào enum)
        status = 'delivered'; 
        createdAt.setDate(createdAt.getDate() - getRandomInt(1, 30));
        
        // Đơn đã giao thì chắc chắn phải có shipper
        if (shippers.length > 0) shipperId = getRandomItem(shippers)._id;

      } else if (rand < 0.6) {
        // 20%: Đang giao hàng
        status = 'shipping'; 
        createdAt.setMinutes(createdAt.getMinutes() - getRandomInt(10, 60));
        
        // Đơn đang giao cũng phải có shipper
        if (shippers.length > 0) shipperId = getRandomItem(shippers)._id;

      } else if (rand < 0.8) {
        // 20%: Đã hủy
        status = 'cancelled';
        createdAt.setDate(createdAt.getDate() - getRandomInt(1, 5));
        // Đơn hủy có thể có shipper hoặc không (tùy hủy lúc nào), ở đây để null cho đơn giản

      } else {
        // 20%: Đang chuẩn bị / Chờ xác nhận
        status = 'preparing'; 
        createdAt.setMinutes(createdAt.getMinutes() - getRandomInt(5, 30));
        // Đang chuẩn bị thì chưa có shipper lấy hàng -> shipperId = null
      }

      // Tạo Object Order
      const newOrder = new Order({
        customerId: customer._id,
        restaurantId: restaurant._id,
        shipperId: shipperId, // <--- Đã thêm shipperId
        items: orderItems,
        totalAmount: totalAmount,
        status: status,
        // Fake địa chỉ giao hàng (lấy từ customer hoặc random gần quán)
        shippingAddress: {
          street: customer.address?.street || '123 Đường Test',
          city: customer.address?.city || 'Hồ Chí Minh',
          lat: customer.address?.lat || 10.762622,
          lng: customer.address?.lng || 106.660172
        },
        paymentMethod: 'COD',
        createdAt: createdAt,
        updatedAt: createdAt
      });

      createdOrders.push(newOrder);
    }

    if (createdOrders.length > 0) {
      await Order.insertMany(createdOrders);
      console.log(`✅ Đã tạo thành công ${createdOrders.length} đơn hàng (có Shipper)!`);
    }

  } catch (error) {
    console.error('❌ Lỗi khi tạo dữ liệu:', error);
  } finally {
    mongoose.disconnect();
    console.log('👋 Đã đóng kết nối.');
  }
};

generateOrders();