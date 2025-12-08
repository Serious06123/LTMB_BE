import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String, //customer, restaurant, shipper
  avatar: String
});

export default mongoose.model('User', userSchema);