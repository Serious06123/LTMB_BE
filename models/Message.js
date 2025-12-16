import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  messageType: { type: String, default: 'text' },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Message', MessageSchema);
