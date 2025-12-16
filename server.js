import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';

// Import Routes
import mapRoutes from './routes/mapRoutes.js';
import authRoutes from './routes/authRoutes.js';

import { resolvers } from './graphql/resolvers.js';
import { typeDefs } from './graphql/typeDefs.js';

import uploadRoutes from './routes/uploadRoutes.js';
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


// === SỬ DỤNG ROUTES ===
// Gắn mapRoutes vào đường dẫn /api
app.use('/api', mapRoutes);
// Gắn auth routes
app.use('/api/auth', authRoutes);
// Gắn upload routes
app.use('/api/upload', uploadRoutes);
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