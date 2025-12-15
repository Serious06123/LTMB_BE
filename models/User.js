import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  
  // QUAN TRỌNG: required: false để Google Login không bị lỗi
  password: { type: String, required: false, default: '' },
  phone: { type: String, required: false, default: '' }, 
  
  role: { 
    type: String, 
    enum: ['customer', 'restaurant', 'shipper', 'admin'], 
    default: 'customer' 
  },
  avatar: { type: String, default: '' },
  
  // Địa chỉ và Tọa độ (Giữ nguyên cho tính năng Map)
  address: {
    street: String,
    city: String,
    lat: Number, 
    lng: Number, 
  },

  // Dành riêng cho Shipper/Nhà hàng
  walletBalance: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false }, 
}, { timestamps: true });

export default mongoose.model('User', userSchema);