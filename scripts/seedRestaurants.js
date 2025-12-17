import 'dotenv/config';
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';

const mongoUri = process.env.MONGO_URI;

async function connect() {
  await mongoose.connect(mongoUri);
}

async function seed() {
  try {
    await connect();
    console.log('Connected to DB');

    // Ensure categories exist
    const catNames = ['Fast Food', 'Pizza', 'Burger', 'Coffee', 'Dessert'];
    const categories = [];
    for (const name of catNames) {
      let c = await Category.findOne({ name });
      if (!c) c = await Category.create({ name, image: '', isActive: true });
      categories.push(c);
    }

    // Ensure a restaurant user exists
    let user = await User.findOne({ email: 'rest1@example.com' });
    if (!user) {
      user = await User.create({
        name: 'Sample Restaurant Owner',
        email: 'rest1@example.com',
        password: '',
        role: 'restaurant',
        isVerified: true,
      });
    }

    // Create sample restaurants (5 items) with lat/lng for map delivery
    const sample = [
      {
        name: 'Pansi Restaurant',
        categories: [categories[0]._id, categories[2]._id], // Fast Food, Burger
        image: 'https://lh3.googleusercontent.com/gps-cs-s/AG0ilSxCj0n-or7Ww3WpUl0Ez05_yf9pDs9zTj26O7NGPMcMOiUynzOj871i6Bpmvvv1cOudjmTdBfOcuvq1zZO74oB9qN53g6ewZVqD8MLbE7Gb8Jrxa_xfWnXOB2mQUDKG-bFm8elA=w426-h240-k-no',
        address: { street: '123 Lê Duẩn', city: 'Hanoi', lat: 21.028511, lng: 105.804817 },
        isOpen: true,
        deliveryTime: '15-25 min',
        deliveryFee: 20000,
      },
      {
        name: 'American Spicy Burger Shop',
        categories: [categories[2]._id, categories[0]._id], // Burger, Fast Food
        image: 'https://lh3.googleusercontent.com/gps-cs-s/AG0ilSyqRbgY1NHljqWNsnwQS9BFKNX20uoZV3f6BpwPTKABl4H-pT45apVI5roboI3IfAdh7aEjj8Sk4gazkdKq2Nsfk4Jhhse_JtoBSsUgUw5Hpi_wCtflN5xlRD0bhnn0USxhzuLZll2Hxxg=w408-h524-k-no',
        address: { street: '45 Nguyễn Huệ', city: 'Ho Chi Minh', lat: 10.772916, lng: 106.698252 },
        isOpen: true,
        deliveryTime: '20-35 min',
        deliveryFee: 25000,
      },
      {
        name: 'Cafeteria Coffee Club',
        categories: [categories[3]._id], // Coffee
        image: 'https://lh3.googleusercontent.com/p/AF1QipOeCGMIwi-yc2G4B99XBu3DN4Hh2FdZET99tiuP=w408-h544-k-no',
        address: { street: '7 Coffee St', city: 'Hanoi', lat: 21.030658, lng: 105.834175 },
        isOpen: true,
        deliveryTime: '10-20 min',
        deliveryFee: 0,
      },
      {
        name: 'Pizza Palace',
        categories: [categories[1]._id], // Pizza
        image: 'https://lh3.googleusercontent.com/p/AF1QipOFp66rduSFyZjMl35gMeceNtikA3acrAU3GVNK=w426-h240-k-no',
        address: { street: '10 Bạch Đằng', city: 'Da Nang', lat: 16.06778, lng: 108.22083 },
        isOpen: true,
        deliveryTime: '25-40 min',
        deliveryFee: 30000,
      },
      {
        name: 'Sweet Tooth Desserts',
        categories: [categories[4]._id, categories[3]._id], // Dessert, Coffee
        image: 'https://lh3.googleusercontent.com/p/AF1QipOvXZ2_sDeTbWrEomvpIRoY7gfAmJ9atlj1nTr2=w426-h240-k-no',
        address: { street: '5 Trần Phú', city: 'Hue', lat: 16.463713, lng: 107.590866 },
        isOpen: true,
        deliveryTime: '15-30 min',
        deliveryFee: 15000,
      },
    ];

    for (const r of sample) {
      const exists = await Restaurant.findOne({ name: r.name });
      if (exists) continue;
      await Restaurant.create({
        name: r.name,
        accountId: user._id,
        categories: r.categories,
        image: r.image,
        address: r.address,
        isOpen: r.isOpen,
        deliveryTime: r.deliveryTime,
        deliveryFee: r.deliveryFee,
        rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
        reviews: Math.floor(Math.random() * 200),
      });
    }

    console.log('Seed complete');
    process.exit(0);
  } catch (e) {
    console.error('Seed error', e);
    process.exit(1);
  }
}

seed();
