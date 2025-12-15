import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true }, // Cần thiết để liên lạc giao hàng
  role: { 
    type: String, 
    enum: ['customer', 'restaurant', 'shipper', 'admin'], 
    default: 'customer' 
  },
  avatar: { type: String, default: '' },
  
  // Địa chỉ và Tọa độ (Quan trọng cho tính năng Bản đồ/Ship)
  address: {
    street: String,
    city: String,
    lat: Number, // Latitude
    lng: Number, // Longitude
  },

  // Dành riêng cho Shipper/Nhà hàng (Ví tiền, trạng thái hoạt động)
  walletBalance: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false }, // Xác thực tài khoản
}, { timestamps: true });

export default mongoose.model('User', userSchema);