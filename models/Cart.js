import mongoose from 'mongoose';

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Lưu quán đang chọn
  items: [
    {
      foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
      name: String,
      price: Number,
      quantity: Number,
      image: String
    }
  ],
  totalAmount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Cart', CartSchema);