import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }, // Để đảm bảo chỉ mua rồi mới được review
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
}, { timestamps: true });

// Đảm bảo 1 user chỉ đánh giá 1 món trong 1 đơn hàng 1 lần
reviewSchema.index({ userId: 1, foodId: 1, orderId: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);