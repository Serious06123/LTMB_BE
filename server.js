import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import http from 'http';
import { Server as IOServer } from 'socket.io';

// Import Routes
import mapRoutes from './routes/mapRoutes.js';
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js'; 

// Import GraphQL Core
import { resolvers } from './graphql/resolvers.js';
import { typeDefs } from './graphql/typeDefs.js';
import { getContext } from './graphql/context.js'; // <--- Import mới

// Import Socket Logic
import { initSocket } from './socket/socketHandler.js'; // <--- Import mới

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGO_URI;

// Kết nối DB
async function connectToDb() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Đã kết nối MongoDB!');
  } catch (e) {
    console.error('❌ Lỗi kết nối MongoDB', e);
    process.exit(1);
  }
}

// Routes REST API
app.use('/api', mapRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

async function startServer() {
  await connectToDb();

  // 1. Cấu hình Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });
  await server.start();

  // 2. Tạo HTTP Server & Socket.IO
  const httpServer = http.createServer(app);
  
  const io = new IOServer(httpServer, {
    cors: { origin: '*' }
  });

  // --- KÍCH HOẠT MODULE SOCKET ---
  initSocket(io); 
  // ------------------------------

  // 3. Kết nối GraphQL vào Express
  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: getContext, // --- SỬ DỤNG MODULE CONTEXT ---
    }),
  );

  // 4. Start
  httpServer.listen(port, () => {
    console.log(`🚀 Server chạy tại http://localhost:${port}`);
    console.log(`🚀 GraphQL tại http://localhost:${port}/graphql`);
    console.log(`🚀 Socket.IO đã sẵn sàng`);
  });
}

startServer();