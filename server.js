// Chuyển toàn bộ sang cú pháp 'import'
import 'dotenv/config'; // Tải các biến từ file .env
import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
// Import từ gói bạn vừa cài đặt
import { expressMiddleware } from '@as-integrations/express5';

const app = express();
// Middleware cơ bản vẫn giữ nguyên
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGO_URI;
const dbName = 'KHCFOOD'; // Tên database của bạn
const GOONG_API_KEY = process.env.GOONG_API_KEY; 
const GOONG_BASE_URL = 'https://rsapi.goong.io';
let db;

// Hàm kết nối đến MongoDB (giữ nguyên)
async function connectToDb() {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✅ Đã kết nối thành công đến MongoDB Atlas!');
    db = client.db(dbName);
  } catch (e) {
    console.error('Không thể kết nối đến MongoDB', e);
    process.exit(1); // Thoát nếu không kết nối được
  }
}

// === ĐỊNH NGHĨA GRAPHQL SCHEMA ===
const typeDefs = `#graphql
  # Định nghĩa kiểu dữ liệu trả về khi đăng nhập
  type AuthPayload {
    success: Boolean!
    token: String
    error: String
  }

  # Định nghĩa các mutation (hàm thay đổi dữ liệu)
  type Mutation {
    login(email: String!, password: String!): AuthPayload!
  }

  # Định nghĩa các query (hàm lấy dữ liệu)
  type Query {
    hello: String
  }
`;

// === ĐỊNH NGHĨA RESOLVERS (LOGIC XỬ LÝ) ===
const resolvers = {
  Query: {
    hello: () => 'Chào mừng bạn đến với GraphQL API!',
  },
  Mutation: {
    // Di chuyển logic từ app.post('/api/login') vào đây
    login: async (_, { email, password }) => {
      try {
        const user = await db.collection('users').findOne({ email: email });

        if (!user) {
          return { success: false, error: 'Không tìm thấy người dùng' };
        }

        // Giả sử bạn so sánh mật khẩu (trong thực tế, hãy dùng bcrypt)
        if (user.password !== password) {
          return { success: false, error: 'Email hoặc mật khẩu không đúng' };
        }

        // Đăng nhập thành công
        return { success: true, token: 'fake-jwt-token-tu-backend-graphql' };

      } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        return { success: false, error: 'Đã có lỗi xảy ra, vui lòng thử lại.' };
      }
    },
  },
};

// === THÊM CÁC API PROXY CHO MAP ===

// 1. Tìm kiếm địa điểm (Find)
app.get('/api/place/find', async (req, res) => {
  try {
    const { input } = req.query;
    const url = `${GOONG_BASE_URL}/Place/Find?input=${encodeURIComponent(input)}&api_key=${GOONG_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Tự động gợi ý (Autocomplete)
app.get('/api/place/autocomplete', async (req, res) => {
  try {
    const { input } = req.query;
    const url = `${GOONG_BASE_URL}/Place/AutoComplete?input=${encodeURIComponent(input)}&api_key=${GOONG_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Lấy tọa độ từ địa chỉ (Geocode)
app.get('/api/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    const url = `${GOONG_BASE_URL}/Geocode?address=${encodeURIComponent(address)}&api_key=${GOONG_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Lấy chi tiết địa điểm (Detail)
app.get('/api/place/detail', async (req, res) => {
  try {
    const { place_id } = req.query;
    const url = `${GOONG_BASE_URL}/Place/Detail?place_id=${place_id}&api_key=${GOONG_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Dẫn đường (Direction)
app.get('/api/direction', async (req, res) => {
  try {
    const { origin, destination, vehicle = 'car' } = req.query;
    const url = `${GOONG_BASE_URL}/Direction?origin=${origin}&destination=${destination}&vehicle=${vehicle}&api_key=${GOONG_API_KEY}&alternatives=true`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// === KHỞI ĐỘNG SERVER ===

// Chúng ta tạo một hàm async để khởi động server
async function startServer() {
  // 1. Kết nối DB
  await connectToDb();

  // 2. Khởi tạo Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  // 3. Khởi động Apollo Server
  await server.start();

  // 4. Gắn Apollo làm middleware cho Express tại endpoint '/graphql'
  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      // bạn có thể thêm context ở đây nếu cần
      context: async ({ req }) => ({ token: req.headers.token }),
    }),
  );

  // 5. Khởi động Express
  app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
    console.log(`🚀 GraphQL endpoint tại http://localhost:${port}/graphql`);
  });
}

// Gọi hàm để bắt đầu mọi thứ
startServer();