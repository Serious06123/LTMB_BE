const typeDefs = `#graphql
  # 1. Định nghĩa kiểu Address (địa chỉ)
  type Address {
    street: String
    city: String
    lat: Float
    lng: Float
  }

  # 2. Cập nhật User Type với đầy đủ các trường mới
  type User {
    id: ID!
    name: String
    email: String
    phone: String          # Mới thêm
    role: String
    avatar: String
    isVerified: Boolean    # Mới thêm (Fix lỗi của bạn)
    walletBalance: Float   # Mới thêm
    address: Address       # Mới thêm
  }

  type Food {
    id: ID!
    name: String!
    price: Float!
    description: String
    image: String
    rating: Float
    reviews: Int
    category: String
    isAvailable: Boolean
    restaurantId: ID
  }

  type Order {
    id: ID!
    totalAmount: Float
    status: String
    items: [OrderItem]
    customerId: ID
    restaurantId: ID
    shipperId: ID
  }

  type OrderItem {
    foodId: ID
    name: String
    price: Float
    quantity: Int
    image: String
  }

  # Kiểu dữ liệu trả về khi đăng nhập/đăng ký
  type AuthPayload {
    token: String
    user: User
    success: Boolean
    error: String
  }
  
  # Kiểu dữ liệu trả về cho các thao tác mutation đơn giản
  type DefaultResponse {
    success: Boolean!
    message: String
    error: String
  }

  type Message {
    _id: ID!
    orderId: ID!
    senderId: ID!
    senderName: String
    receiverId: ID!
    content: String!
    messageType: String
    isRead: Boolean
    createdAt: String
  }

  type Query {
    getFoods(category: String): [Food]
    getRunningOrders: [Order]
    myRunningOrders(userId: ID!): [Order]
    getUserProfile(id: ID!): User
    messages(orderId: ID!, limit: Int = 50, offset: Int = 0): [Message]
  }

  type Mutation {
    # Login nhận identifier (email hoặc phone). Backwards-compatible: accept `identifier` or `email`.
    login(identifier: String, email: String, password: String!): AuthPayload

    # Register đầy đủ tham số
    register(
      name: String!, 
      email: String!, 
      password: String!, 
      phone: String!, 
      role: String
    ): String # Trả về message thông báo

    # Verify OTP (Fix lỗi thiếu cái này)
    verifyOtp(email: String!, otp: String!): AuthPayload
    
    # Đổi mật khẩu
    changePassword(email: String!, newPassword: String!): DefaultResponse

    # Messages
    sendMessage(orderId: ID!, receiverId: ID!, content: String!, messageType: String): Message
    markMessagesRead(orderId: ID!, userId: ID!): Boolean
  }
`;

export { typeDefs };