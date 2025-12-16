import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';
import Message from '../models/Message.js';

// Hàm helper xác thực token riêng cho Socket
function verifyToken(token) {
  if (!token) return null;
  // Cho phép token test cục bộ
  if (typeof token === 'string' && token.startsWith('TEST:')) {
    return { userId: token.replace('TEST:', ''), role: 'test' };
  }
  try {
    return jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'SECRET_KEY');
  } catch (err) {
    return null;
  }
}

// Hàm chính export ra để server.js gọi
export const initSocket = (io) => {
  io.on('connection', (socket) => {
    // 1. Xác thực khi kết nối
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const payload = verifyToken(token || '');

    if (!payload) {
      console.log('Socket connected without valid token (Guest)');
    } else {
      socket.user = payload; // { userId, role }
      // console.log(`User connected: ${payload.userId}`);
    }

    // 2. Sự kiện: Tham gia phòng chat của đơn hàng
    socket.on('join_order', async ({ orderId }) => {
      try {
        if (!orderId) return;
        
        const order = await Order.findById(orderId);
        if (!order) return socket.emit('error', { message: 'Order not found' });

        // Kiểm tra quyền (nếu không phải test user)
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
        // console.log(`Socket joined room: ${room}`);
      } catch (err) {
        console.error('join_order error', err);
        socket.emit('error', { message: 'Server error' });
      }
    });

    // 3. Sự kiện: Gửi tin nhắn
    socket.on('send_message', async (data) => {
      try {
        const { orderId, receiverId, content, messageType = 'text' } = data || {};
        if (!orderId || !receiverId || !content) return socket.emit('error', { message: 'Missing fields' });

        const order = await Order.findById(orderId);
        if (!order) return socket.emit('error', { message: 'Order not found' });

        const isTestUser = socket.user?.role === 'test';
        const senderId = socket.user?.userId;

        if (!senderId && !isTestUser) return socket.emit('error', { message: 'Unauthorized' });

        // Logic kiểm tra cặp người gửi/nhận
        const isValidPair = isTestUser || (
          (senderId.toString() === order.customerId.toString() && receiverId === order.shipperId?.toString()) ||
          (senderId.toString() === order.shipperId?.toString() && receiverId === order.customerId.toString())
        );

        if (!isValidPair) return socket.emit('error', { message: 'Invalid sender/receiver pair' });

        // Lưu vào DB
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

        // Gửi tin nhắn đến phòng (room)
        const room = `order_${orderId}`;
        io.to(room).emit('message_received', out);

      } catch (err) {
        console.error('send_message error', err);
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('disconnect', () => {
      // Cleanup nếu cần
    });
  });
};