import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customerId: mongoose.Schema.Types.ObjectId,
  shipperId: mongoose.Schema.Types.ObjectId,
  totalAmount: Number,
  status: String, // 'pending', 'shipping', 'delivered'
  items: [
    {
      foodId: mongoose.Schema.Types.ObjectId,
      name: String,
      price: Number,
      quantity: Number,
      image: String,
      tag: String // Ví dụ: '#Breakfast'
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Order', orderSchema);