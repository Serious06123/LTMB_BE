import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import jwt from 'jsonwebtoken'; // <--- QUAN TRỌNG: Để giải mã token

// Import Routes
import mapRoutes from './routes/mapRoutes.js';
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js'; // <--- QUAN TRỌNG: Fix lỗi 404

import { resolvers } from './graphql/resolvers.js';
import { typeDefs } from './graphql/typeDefs.js';

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGO_URI;

// Kết nối MongoDB
async function connectToDb() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Đã kết nối thành công đến MongoDB Atlas (Mongoose)!');
  } catch (e) {
    console.error('❌ Không thể kết nối đến MongoDB', e);
    process.exit(1);
  }
}

// === SỬ DỤNG ROUTES ===
app.use('/api', mapRoutes);
app.use('/api/auth', authRoutes);

// --- QUAN TRỌNG: Đăng ký route Upload ---
app.use('/api/upload', uploadRoutes); // Fix lỗi 404 tại đây
// ---------------------------------------

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
      // Logic giải mã Token để lấy userId
      context: async ({ req }) => {
        const authHeader = req.headers.authorization || ''; 
        const token = authHeader.replace('Bearer ', '');

        if (!token) return {}; 

        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'SECRET_KEY');
          return { userId: decoded.userId, role: decoded.role };
        } catch (err) {
          return {};
        }
      },
    }),
  );

  app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
    console.log(`🚀 GraphQL endpoint tại http://localhost:${port}/graphql`);
    console.log(`🚀 Map API endpoint tại http://localhost:${port}/api`);
    console.log(`🚀 Upload API endpoint tại http://localhost:${port}/api/upload`);
  });
}

startServer();