import mongoose from 'mongoose';

const ShipperSchema = new mongoose.Schema({
  name: { type: String, required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  image: { type: String },
  address: {
    lat: { type: Number },
    lng: { type: Number },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true }); // Tự động thêm createdAt và updatedAt

export default mongoose.model('Shipper', ShipperSchema);