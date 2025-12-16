import jwt from 'jsonwebtoken';

export const getContext = async ({ req }) => {
  // 1. Lấy token từ header chuẩn "authorization"
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  // 2. Mặc định user chưa đăng nhập
  let userContext = { token };

  // 3. Nếu có token, thử giải mã để lấy userId
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'SECRET_KEY');
      // Gán userId và role vào context
      userContext = {
        token,
        userId: decoded.userId,
        role: decoded.role,
      };
    } catch (err) {
      // Token lỗi hoặc hết hạn => bỏ qua
      // console.log("Token invalid:", err.message);
    }
  }

  return userContext;
};