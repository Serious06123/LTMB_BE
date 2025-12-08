import mongoose from 'mongoose';

const foodSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  image: String,
  rating: Number,
  reviews: Number,
  category: String, // 'Breakfast', 'Lunch', 'Dinner'
  status: String,   // 'Pick UP', 'Delivery'
  restaurantId: mongoose.Schema.Types.ObjectId,
  ingredients: [{ name: String, icon: String }]
});

export default mongoose.model('Food', foodSchema);