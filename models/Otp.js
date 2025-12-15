import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Tự động xóa sau 300 giây (5 phút)
});

// Lưu ý: Nếu dùng expiresAt kiểu Date cụ thể thay vì seconds, bạn có thể giữ nguyên code cũ nhưng thêm index
// otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Otp', otpSchema);