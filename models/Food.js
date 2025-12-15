import mongoose from 'mongoose';

const foodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  image: String,
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  category: { type: String, required: true }, // Ví dụ: 'Fast Food', 'Drink'
  
  // Trạng thái món ăn
  isAvailable: { type: Boolean, default: true }, // True: Còn món, False: Hết món
  
  // Liên kết tới User (với role là restaurant)
  restaurantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  
  ingredients: [{ 
    name: String, 
    icon: String 
  }]
}, { timestamps: true });

export default mongoose.model('Food', foodSchema);