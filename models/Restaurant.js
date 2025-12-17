import mongoose from 'mongoose';

const RestaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  image: { type: String },
  address: {
    street: String,
    city: String,
    lat: Number,
    lng: Number,
  },
  isOpen: { type: Boolean, default: true },
  deliveryTime: { type: String },
  deliveryFee: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Restaurant', RestaurantSchema);
