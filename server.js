import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

import Message from './models/Message.js';
import Order from './models/Order.js';
import User from './models/User.js';

// Import Routes
import mapRoutes from './routes/mapRoutes.js';
import authRoutes from './routes/authRoutes.js';

import { resolvers } from './graphql/resolvers.js';
import { typeDefs } from './graphql/typeDefs.js';
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
// Messages REST
import messageRoutes from './routes/messageRoutes.js';
app.use('/api/messages', messageRoutes);

// === KHỞI ĐỘNG SERVER ===
async function startServer() {
  await connectToDb();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  // Create HTTP server and attach Socket.IO BEFORE mounting GraphQL
  const httpServer = http.createServer(app);
  const io = new IOServer(httpServer, {
    cors: { origin: '*' }
  });

  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ token: req.headers.token, io }),
    }),
  );

  // Socket.IO auth helper
  function verifyToken(token) {
    if (!token) return null;
    // Allow test tokens in the form "TEST:<userId>" for local testing without JWT signature
    if (typeof token === 'string' && token.startsWith('TEST:')) {
      return { userId: token.replace('TEST:', ''), role: 'test' };
    }
    try {
      const data = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'SECRET_KEY');
      return data;
    } catch (err) {
      return null;
    }
  }

  io.on('connection', (socket) => {
    // token can be passed in handshake auth or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const payload = verifyToken(token || '');
    if (!payload) {
      // unauthorized: still allow but mark as guest (can be refined)
      console.log('Socket connected without valid token');
      // socket.disconnect(true); // optional
    } else {
      socket.user = payload; // { userId, role }
    }

    // Join order room
    socket.on('join_order', async ({ orderId }) => {
      try {
        if (!orderId) return;
        // Validate membership if possible
        const order = await Order.findById(orderId);
        if (!order) return socket.emit('error', { message: 'Order not found' });

        // If authenticated, ensure user is customer or shipper
        const isTestUser = socket.user?.role === 'test';
        if (socket.user && !isTestUser) {
          const uid = socket.user.userId?.toString();
          if (order.customerId.toString() !== uid && order.shipperId?.toString() !== uid) {
            return socket.emit('error', { message: 'Unauthorized to join this order room' });
          }
        }

        const room = `order_${orderId}`;
        socket.join(room);
        socket.emit('joined', { orderId });
      } catch (err) {
        console.error('join_order error', err);
        socket.emit('error', { message: 'Server error' });
      }
    });

    // Handle sending message
    socket.on('send_message', async (data) => {
      // data: { orderId, receiverId, content, messageType }
      try {
        const { orderId, receiverId, content, messageType = 'text' } = data || {};
        if (!orderId || !receiverId || !content) return socket.emit('error', { message: 'Missing fields' });

        const order = await Order.findById(orderId);
        if (!order) return socket.emit('error', { message: 'Order not found' });

        const isTestUser = socket.user?.role === 'test';
        const senderId = socket.user?.userId;
        if (!senderId && !isTestUser) return socket.emit('error', { message: 'Unauthorized' });

        // Only allow messaging during active delivery states (you can adjust states)
        if (!['pending', 'preparing', 'shipping', 'delivered'].includes(order.status)) {
          // allow basic flow but we keep existing checks minimal
        }

        // Validate sender/receiver pair
        // For local tests using TEST: tokens, allow bypassing strict pair validation.
        const isValidPair = isTestUser || (
          (senderId.toString() === order.customerId.toString() && receiverId === order.shipperId?.toString()) ||
          (senderId.toString() === order.shipperId?.toString() && receiverId === order.customerId.toString())
        );
        if (!isValidPair) return socket.emit('error', { message: 'Invalid sender/receiver for this order' });

        // Create message
        const msg = await Message.create({ orderId, senderId, receiverId, content, messageType });

        const populated = await Message.findById(msg._id).populate('senderId', 'name avatar');

        const out = {
          _id: populated._id,
          orderId: populated.orderId,
          senderId: populated.senderId._id,
          senderName: populated.senderId.name,
          content: populated.content,
          messageType: populated.messageType,
          isRead: populated.isRead,
          createdAt: populated.createdAt
        };

        // Emit to room
        const room = `order_${orderId}`;
        io.to(room).emit('message_received', out);

        // Optionally emit to specific receiver socket (if online)
        // io.to(`user_${receiverId}`).emit('message_received', out);

      } catch (err) {
        console.error('send_message error', err && err.stack ? err.stack : err, { data });
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('disconnect', (reason) => {
      // cleanup if needed
    });
  });

  httpServer.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
    console.log(`🚀 GraphQL endpoint tại http://localhost:${port}/graphql`);
    console.log(`🚀 Map API endpoint tại http://localhost:${port}/api`);
    console.log(`🚀 Socket.IO ready`);
  });
}

startServer();