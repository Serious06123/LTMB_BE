// Trong file: server.js (của dự án backend)

require('dotenv').config(); // Tải các biến từ file .env
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors()); // Cho phép React Native App gọi
app.use(express.json()); // Cho phép server đọc JSON từ body

const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGO_URI;
const dbName = 'KHCFOOD'; // Tên database của bạn

let db;

// Hàm kết nối đến MongoDB
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

// === TẠO API ENDPOINT ===

// Ví dụ: Tạo API cho chức năng đăng nhập
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Đây là nơi bạn sẽ tìm user trong database
    // (Vì lý do bảo mật, bạn nên mã hóa mật khẩu)
    const user = await db.collection('users').findOne({ email: email });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
    }

    // Giả sử bạn so sánh mật khẩu (trong thực tế, hãy dùng bcrypt)
    if (user.password !== password) {
      return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không đúng' });
    }

    // Đăng nhập thành công, trả về token (giống logic cũ của bạn)
    res.json({ success: true, token: 'fake-jwt-token-tu-backend' });

  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ success: false, error: 'Đã có lỗi xảy ra, vui lòng thử lại.' });
  }
});

// (Thêm các API khác tại đây, ví dụ: /api/register)

// === KHỞI ĐỘNG SERVER ===
connectToDb().then(() => {
  app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
  });
});