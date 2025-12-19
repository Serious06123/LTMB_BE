import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Cart from '../models/Cart.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/ltmb';
  await mongoose.connect(uri);
  console.log('Connected to', uri);

  const cursor = Cart.find({}).cursor();
  let updated = 0;
  for (let cart = await cursor.next(); cart != null; cart = await cursor.next()) {
    const rootRid = cart.restaurantId ? String(cart.restaurantId) : null;
    let changed = false;
    cart.items = (cart.items || []).map(it => {
      // if item.restaurantId missing and we have rootRid, copy it
      if (!it.restaurantId && rootRid) {
        it.restaurantId = new mongoose.Types.ObjectId(rootRid);
        changed = true;
      }
      return it;
    });
    if (changed) {
      await cart.save();
      updated++;
    }
  }

  console.log('Migration complete. Carts updated:', updated);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration error', err);
  process.exit(1);
});
