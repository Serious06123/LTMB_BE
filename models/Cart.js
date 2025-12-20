import mongoose from 'mongoose';

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  items: [
    {
      foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
      // Optional: store which restaurant this item belongs to
      restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
      name: String,
      price: Number,
      quantity: Number,
      image: String
    }
  ],
  totalAmount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Cart', CartSchema);