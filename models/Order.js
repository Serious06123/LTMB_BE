import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Đơn hàng thuộc về nhà hàng nào
  shipperId: { type: mongoose.Schema.Types.ObjectId, ref:   'User' }, // Có thể null lúc mới đặt
  
  totalAmount: { type: Number, required: true },
  
  // Trạng thái chi tiết hơn
  status: { 
    type: String, 
    enum: ['pending', 'preparing', 'shipping', 'delivered', 'cancelled', 'completed'], 
    default: 'pending' 
  },
  
  // Địa chỉ giao hàng cho đơn hàng NÀY (Snapshot)
  shippingAddress: {
    street: String,
    city: String,
    lat: Number,
    lng: Number
  },

  paymentMethod: { type: String, enum: ['COD', 'ONLINE'], default: 'COD' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },

  items: [
    {
      foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
      name: String,
      price: Number,
      quantity: Number,
      image: String,
    }
  ],
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);