import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';

// Import Models
import Food from './models/Food.js';
import Order from './models/Order.js';
import User from './models/User.js';

// Import Routes
import mapRoutes from './routes/mapRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGO_URI;

// 1. Kết nối MongoDB qua Mongoose
async function connectToDb() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Đã kết nối thành công đến MongoDB Atlas (Mongoose)!');
  } catch (e) {
    console.error('❌ Không thể kết nối đến MongoDB', e);
    process.exit(1);
  }
}

// 2. Định nghĩa GraphQL Schema
const typeDefs = `#graphql
  type User {
    id: ID
    name: String
    email: String
    role: String
  }

  type Ingredient {
    name: String
    icon: String
  }

  type Food {
    id: ID!
    name: String
    price: Float
    image: String
    rating: Float
    reviews: Int
    category: String
    status: String
    description: String
    ingredients: [Ingredient]
  }

  type OrderItem {
    name: String
    price: Float
    quantity: Int
    image: String
    tag: String
  }

  type Order {
    id: ID
    status: String
    totalAmount: Float
    items: [OrderItem]
    shipperId: ID
  }

  type AuthPayload {
    success: Boolean!
    token: String
    error: String
    user: User
  }


  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    register(name: String!, email: String!, password: String!): AuthPayload!
    changePassword(email: String!, newPassword: String!): AuthPayload!
  }

  type Query {
    getFoods(category: String): [Food]
    getRunningOrders: [Order]
    myRunningOrders(userId: ID!): [Order]
  }
`;

// 3. Resolvers (Dùng Mongoose Model)
const resolvers = {
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
        // --- ĐÃ SỬA: Dùng Mongoose User.findOne thay vì db.collection ---
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

// === SỬ DỤNG ROUTES ===
// Gắn mapRoutes vào đường dẫn /api
app.use('/api', mapRoutes);
// Gắn auth routes
app.use('/api/auth', authRoutes);

// (Đã xóa các đoạn app.get cũ bị trùng lặp ở đây để code gọn hơn)

// === KHỞI ĐỘNG SERVER ===
async function startServer() {
  await connectToDb();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ token: req.headers.token }),
    }),
  );

  app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
    console.log(`🚀 GraphQL endpoint tại http://localhost:${port}/graphql`);
    console.log(`🚀 Map API endpoint tại http://localhost:${port}/api`);
  });
}

startServer();